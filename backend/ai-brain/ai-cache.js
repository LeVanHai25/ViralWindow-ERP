const NodeCache = require('node-cache');

// =====================================================
// REDIS + LOCAL CACHE — AI Cache Layer
// =====================================================
// Render Free Plan: Redis (Upstash) có thể hết hạn hoặc không khả dụng
// → Tự động dùng Local Cache (node-cache) trên RAM khi Redis không có
// =====================================================

let redis = null;
let isRedisConnected = false;

// Chỉ kết nối Redis nếu có REDIS_HOST hợp lệ
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_URL = process.env.REDIS_URL;
const REDIS_ENABLED = (REDIS_URL && REDIS_URL.length > 10) || (REDIS_HOST && REDIS_HOST !== '127.0.0.1' && REDIS_HOST !== 'localhost');

if (REDIS_ENABLED) {
    try {
        const Redis = require('ioredis');
        // Ưu tiên REDIS_URL (Upstash dùng URL format), fallback sang host/port
        const redisConfig = REDIS_URL
            ? REDIS_URL
            : {
                host: REDIS_HOST,
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
            };
        redis = new Redis(redisConfig, {
            retryStrategy: (times) => {
                if (times > 2) {
                    console.warn('[AI Cache] ⚠️ Redis không khả dụng sau 2 lần thử. Dùng Local Cache.');
                    return null;
                }
                return Math.min(times * 500, 2000);
            },
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true
        });

        redis.on('ready', () => {
            isRedisConnected = true;
            console.log('[AI Cache] 🟢 Redis đã kết nối thành công.');
        });
        redis.on('error', (err) => {
            isRedisConnected = false;
            // Chỉ log 1 lần, không spam
            if (!redis._errorLogged) {
                console.warn('[AI Cache] 🔴 Redis lỗi:', err.message, '→ Dùng Local Cache');
                redis._errorLogged = true;
            }
        });
        redis.on('close', () => { isRedisConnected = false; });

        // Thử kết nối (không throw nếu thất bại)
        redis.connect().catch(() => {
            console.log('[AI Cache] ℹ️ Redis không khả dụng. Hoàn toàn dùng Local Cache.');
        });
    } catch (e) {
        console.log('[AI Cache] ℹ️ ioredis không có sẵn. Dùng Local Cache.');
        redis = null;
    }
} else {
    console.log('[AI Cache] ℹ️ REDIS_HOST không được cấu hình. Dùng Local Cache (đủ cho Render Free Plan).');
}

// Cache dự phòng trên RAM (luôn sẵn sàng)
const localCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Chống Cache Stampede
const pendingRequests = new Map();

/**
 * Lấy dữ liệu AI với caching thông minh
 * Redis (nếu có) → Local Cache → Gọi API
 */
async function getCachedAI(key, generateFn, ttlSeconds = 600) {
    try {
        // Circuit Breaker
        if (isRedisConnected && redis) {
            const isShattered = await redis.get('ai:circuit_breaker');
            if (isShattered) {
                console.warn(`[AI Circuit Breaker] 🛑 Cầu dao đang MỞ. Fallback cho: ${key}`);
                throw new Error('CIRCUIT_BREAKER_ACTIVE');
            }
        }

        // Chống Stampede
        if (pendingRequests.has(key)) {
            return await pendingRequests.get(key);
        }

        // Check Redis
        if (isRedisConnected && redis) {
            try {
                const cachedData = await redis.get(key);
                if (cachedData) {
                    console.log(`[AI Cache] ⚡ REDIS HIT → ${key}`);
                    return JSON.parse(cachedData);
                }
            } catch (redisErr) {
                // Silent fallback to local
            }
        }

        // Check Local Cache
        const localHit = localCache.get(key);
        if (localHit) {
            console.log(`[AI Cache] ⚡ LOCAL HIT → ${key}`);
            return localHit;
        }

        console.log(`[AI Cache] 🐢 CACHE MISS → Gọi AI API: ${key}`);

        // Gọi API và cache kết quả
        const promise = generateFn().then(async (result) => {
            if (result) {
                if (isRedisConnected && redis) {
                    try {
                        await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
                    } catch (e) { /* fallback to local */ }
                }
                localCache.set(key, result, ttlSeconds);
            }
            return result;
        }).finally(() => {
            pendingRequests.delete(key);
        });

        pendingRequests.set(key, promise);
        return await promise;

    } catch (error) {
        pendingRequests.delete(key);

        if (error.code === 'QUOTA_EXHAUSTED') {
            if (isRedisConnected && redis) {
                console.error(`[AI Circuit Breaker] 💥 API KEY HẾT QUOTA! Tắt AI trong 1 giờ.`);
                await redis.set('ai:circuit_breaker', 'true', 'EX', 3600);
            }
            throw new Error('Cầu dao AI đã đóng do hết Quota.');
        }

        if (error.message === 'CIRCUIT_BREAKER_ACTIVE') {
            throw error;
        }

        console.error(`[AI Cache] Lỗi xử lý ${key}:`, error.message);
        return await generateFn();
    }
}

/**
 * Xoá cache theo pattern
 */
async function invalidateAICache(pattern) {
    // Xoá Local Cache
    try {
        const localKeys = localCache.keys().filter(k => k.indexOf(pattern.replace('*', '')) !== -1);
        if (localKeys.length > 0) localCache.del(localKeys);
    } catch (e) { }

    // Xoá Redis Cache
    if (isRedisConnected && redis) {
        try {
            let cursor = '0';
            let totalDeleted = 0;
            do {
                const res = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
                cursor = res[0];
                const keys = res[1];
                if (keys.length > 0) {
                    await redis.del(...keys);
                    totalDeleted += keys.length;
                }
            } while (cursor !== '0');
            if (totalDeleted > 0) console.log(`[AI Cache] 🗑️ Đã xoá ${totalDeleted} Redis keys: ${pattern}`);
        } catch (e) { }
    }
}

module.exports = {
    getCachedAI,
    invalidateAICache,
    redisClient: redis
};

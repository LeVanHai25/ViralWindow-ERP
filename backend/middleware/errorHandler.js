/**
 * Centralized Error Handler Middleware
 * Xử lý lỗi tập trung cho toàn bộ API
 */

// Custom Error Classes
class AppError extends Error {
    constructor(message, statusCode, code = 'UNKNOWN_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Lỗi có thể dự đoán được
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Không tìm thấy tài nguyên') {
        super(message, 404, 'NOT_FOUND');
    }
}

class ValidationError extends AppError {
    constructor(message = 'Dữ liệu không hợp lệ') {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Chưa đăng nhập') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Không có quyền truy cập') {
        super(message, 403, 'FORBIDDEN');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Dữ liệu đã tồn tại') {
        super(message, 409, 'CONFLICT');
    }
}

// Async Handler Wrapper - Tự động catch errors từ async functions
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    // Log error cho development/debugging
    if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error:', {
            message: err.message,
            code: err.code,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
    }

    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Lỗi server nội bộ';
    let code = err.code || 'INTERNAL_ERROR';

    // Handle specific MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'Dữ liệu đã tồn tại trong hệ thống';
        code = 'DUPLICATE_ENTRY';
    } else if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400;
        message = 'Tham chiếu đến dữ liệu không tồn tại';
        code = 'FOREIGN_KEY_ERROR';
    } else if (err.code === 'ER_ROW_IS_REFERENCED' || err.code === 'ER_ROW_IS_REFERENCED_2') {
        statusCode = 400;
        message = 'Không thể xóa vì dữ liệu đang được tham chiếu';
        code = 'REFERENCE_ERROR';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Không thể kết nối database';
        code = 'DATABASE_UNAVAILABLE';
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Token không hợp lệ';
        code = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token đã hết hạn';
        code = 'TOKEN_EXPIRED';
    }

    // Handle Multer (upload) errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File quá lớn';
        code = 'FILE_TOO_LARGE';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'Số lượng file vượt quá giới hạn';
        code = 'TOO_MANY_FILES';
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        message: message,
        code: code,
        ...(process.env.NODE_ENV !== 'production' && { 
            stack: err.stack,
            details: err.details 
        })
    });
};

// 404 Handler - Route không tồn tại
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Không tìm thấy route: ${req.method} ${req.originalUrl}`);
    next(error);
};

module.exports = {
    AppError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    asyncHandler,
    errorHandler,
    notFoundHandler
};

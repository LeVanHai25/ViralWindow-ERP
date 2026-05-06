/**
 * Finance Sync Manager
 * Cross-tab synchronization for financial data updates
 * Uses LocalStorage events to notify other open tabs when financial data changes
 */

const FinanceSyncManager = {
    EVENT_KEY: 'financial_update_event',

    /**
     * Trigger a financial data update event across all open tabs
     * @param {string} eventType - Type of event: 'receipt_posted', 'payment_posted', 'transaction_updated', 'transaction_cancelled'
     * @param {object} data - Optional data payload (e.g. transactionId, amount)
     */
    trigger: function (eventType, data) {
        try {
            const event = {
                type: eventType,
                data: data || {},
                timestamp: Date.now()
            };
            // Set + remove pattern: ensures the storage event fires even for repeated identical events
            localStorage.setItem(this.EVENT_KEY, JSON.stringify(event));
            localStorage.removeItem(this.EVENT_KEY);
            console.log('📤 Financial sync event triggered:', eventType, data);
        } catch (err) {
            console.warn('⚠️ FinanceSyncManager.trigger failed:', err.message);
        }
    },

    /**
     * Listen for financial data update events from other tabs
     * Note: The 'storage' event ONLY fires on OTHER tabs, not the originating tab
     * @param {function} callback - Called with the parsed event object when an update is received
     */
    listen: function (callback) {
        if (typeof callback !== 'function') return;

        window.addEventListener('storage', function (e) {
            if (e.key === FinanceSyncManager.EVENT_KEY && e.newValue) {
                try {
                    const event = JSON.parse(e.newValue);
                    console.log('📥 Financial sync event received:', event.type);
                    callback(event);
                } catch (err) {
                    console.warn('⚠️ FinanceSyncManager: Error parsing event:', err.message);
                }
            }
        });

        console.log('👂 FinanceSyncManager: Listening for cross-tab financial updates');
    }
};

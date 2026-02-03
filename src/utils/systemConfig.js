import SystemSettingRepository from '../repositories/systemSetting.repository.js';
import Logger from './logger.js';
import env from '../config/env.js';

/**
 * Enterprise System Configuration Utility
 * Implements a cache-aside pattern to reduce database load.
 */
class SystemConfig {
    constructor() {
        this.cache = null;
        this.lastFetched = null;
        this.ttl = 60 * 1000; // 1 minute local cache TTL
    }

    /**
     * Get all system settings
     * @returns {Promise<Object>} The current system settings
     */
    async getSettings() {
        const now = Date.now();

        // Return cached settings if they exist and are not expired
        if (this.cache && this.lastFetched && (now - this.lastFetched < this.ttl)) {
            return this.cache;
        }

        try {
            const settings = await SystemSettingRepository.getSettings();
            this.cache = settings;
            this.lastFetched = now;
            return settings;
        } catch (error) {
            Logger.error('Failed to fetch system settings:', error);
            // Fallback to default values if database fails
            return this.cache || {
                appDebug: true,
                appMode: 'Dev',
                appName: 'Multi Vendor'
            };
        }
    }

    /**
     * Refresh the local cache immediately
     */
    async refreshCache() {
        try {
            const settings = await SystemSettingRepository.getSettings();
            this.cache = settings;
            this.lastFetched = Date.now();
            Logger.info('System settings cache refreshed');
        } catch (error) {
            Logger.error('Failed to refresh system settings cache:', error);
        }
    }

    /**
     * Check if debug mode is enabled
     */
    async isDebugEnabled() {
        const settings = await this.getSettings();
        return settings.appDebug === true;
    }

    /**
     * Check if the app is in Live mode
     */
    async isLiveMode() {
        const settings = await this.getSettings();
        return settings.appMode === 'Live';
    }

    /**
     * Get Dynamic Application URL based on request origin
     * Supports both localhost and production transparently.
     * @param {Object} req - Express Request Object
     */
    async getDynamicAppUrl(req) {
        // 1. Get origin from request headers
        const origin = req.headers.origin;

        // 2. Fetch configured origins from environment
        const allowedOrigins = env.ALLOWED_ORIGINS
            ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
            : [];

        // 3. If origin exists and is whitelisted, use it as the dynamic URL
        if (origin) {
            const normalizedOrigin = origin.replace(/\/$/, "");
            if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes(origin)) {
                return normalizedOrigin;
            }
        }

        // 4. Default: Fallback to the appUrl stored in system settings (database)
        const settings = await this.getSettings();
        return settings.appUrl;
    }
}

export default new SystemConfig();

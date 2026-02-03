import PaymentGatewayRepository from '../repositories/paymentGateway.repository.js';
import { encrypt, decrypt } from '../utils/encryption.util.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import Logger from '../utils/logger.js';

class PaymentGatewayService {
    /**
     * Get all gateways for Admin (includes encrypted fields as placeholder)
     */
    async getAllGateways() {
        const gateways = await PaymentGatewayRepository.getAll();
        return gateways.map(g => this._prepareAdminGateway(g));
    }

    /**
     * Get public active gateways (No sensitive data)
     * Hierarchical check: Global Digital Toggle > Individual Gateway Toggle
     */
    async getPublicGateways() {
        const PaymentSettingRepository = (await import('../repositories/paymentSetting.repository.js')).default;
        const settings = await PaymentSettingRepository.getSettings();

        // If global digital payment is OFF, return empty array for digital gateways
        if (!settings.isDigitalPaymentActive) {
            return [];
        }

        const gateways = await PaymentGatewayRepository.getActive();
        return gateways.map(g => ({
            name: g.name,
            title: g.title,
            logo: g.logo,
        }));
    }

    /**
     * Update gateway configuration and encrypt secrets
     */
    async updateGateway(name, data, adminId, role) {
        const gateway = await PaymentGatewayRepository.findByName(name);
        if (!gateway) {
            throw new AppError('Payment gateway not found', HTTP_STATUS.NOT_FOUND);
        }

        const updatePayload = {
            updatedBy: adminId,
            updatedByModel: role,
        };

        if (data.title !== undefined) updatePayload.title = data.title;
        if (data.logo !== undefined) updatePayload.logo = data.logo;
        if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

        // Handle nested config update to prevent data loss
        if (data.config) {
            const currentConfig = gateway.config || {};
            const newConfig = { ...currentConfig };

            if (data.config.apiKey) newConfig.apiKey = encrypt(String(data.config.apiKey));
            if (data.config.apiSecret) newConfig.apiSecret = encrypt(String(data.config.apiSecret));
            if (data.config.webhookSecret) newConfig.webhookSecret = encrypt(String(data.config.webhookSecret));
            if (data.config.clientId) newConfig.clientId = encrypt(String(data.config.clientId));

            updatePayload.config = newConfig;
        }

        const updated = await PaymentGatewayRepository.update(name, updatePayload);
        return this._prepareAdminGateway(updated);
    }

    /**
     * Get decrypted credentials for internal use (e.g., when processing payments)
     */
    async getGatewayCredentials(name) {
        const gateway = await PaymentGatewayRepository.findByName(name);
        if (!gateway || !gateway.isActive) {
            throw new AppError(`Payment gateway ${name} is not active or not found`, HTTP_STATUS.BAD_REQUEST);
        }

        return {
            name: gateway.name,
            config: {
                apiKey: decrypt(gateway.config?.apiKey),
                apiSecret: decrypt(gateway.config?.apiSecret),
                webhookSecret: decrypt(gateway.config?.webhookSecret),
                clientId: decrypt(gateway.config?.clientId)
            }
        };
    }

    /**
     * Private helper to mask encrypted fields for Admin UI
     */
    _prepareAdminGateway(gateway) {
        if (!gateway) return null;

        // If it's a lean object, we don't need toObject()
        const g = gateway._id ? gateway : { ...gateway };

        if (g.config) {
            const maskedConfig = { ...g.config };
            if (maskedConfig.apiKey) maskedConfig.apiKey = '********';
            if (maskedConfig.apiSecret) maskedConfig.apiSecret = '********';
            if (maskedConfig.webhookSecret) maskedConfig.webhookSecret = '********';
            if (maskedConfig.clientId) maskedConfig.clientId = '********';
            g.config = maskedConfig;
        }
        return g;
    }
    /**
     * Bootstrap default supported gateways
     */
    async bootstrapGateways() {
        const supportedGateways = [
            { name: 'paypal', title: 'PayPal' },
            { name: 'razorpay', title: 'Razorpay' },
            { name: 'stripe', title: 'Stripe' },
            { name: 'payu', title: 'PayU' },
            { name: 'ccavenue', title: 'CCAvenue' }
        ];

        for (const g of supportedGateways) {
            const exists = await PaymentGatewayRepository.findByName(g.name);
            if (!exists) {
                await PaymentGatewayRepository.update(g.name, {
                    title: g.title,
                    isActive: false,
                    config: {
                        apiKey: '',
                        apiSecret: '',
                        webhookSecret: '',
                        clientId: ''
                    }
                });
                Logger.info(`Bootstrapped payment gateway: ${g.name}`);
            }
        }
    }
}

export default new PaymentGatewayService();

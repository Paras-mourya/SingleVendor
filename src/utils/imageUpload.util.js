import axios from 'axios';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary.js';
import Logger from './logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/**
 * Download image from URL and upload to Cloudinary
 * @param {string} url - Public image URL
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadImageFromUrl = async (url, folder = 'products') => {
    let tempFilePath = null;
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);
        const fileName = `${uuidv4()}${path.extname(new URL(url).pathname) || '.jpg'}`;
        tempFilePath = path.join(os.tmpdir(), fileName);

        fs.writeFileSync(tempFilePath, buffer);

        // Upload using existing cloudinary utility (mocking a file object)
        const result = await uploadToCloudinary({ path: tempFilePath }, folder);

        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        Logger.error('Image Upload from URL Failed', { url, error: error.message });
        throw new Error(`Failed to upload image from URL: ${url}`);
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

/**
 * Upload multiple images from URLs
 * @param {string[]} urls - Array of image URLs
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
export const uploadMultipleImagesFromUrls = async (urls, folder = 'products') => {
    const results = [];
    for (const url of urls) {
        if (!url) continue;
        try {
            const result = await uploadImageFromUrl(url.trim(), folder);
            results.push(result);
        } catch (error) {
            Logger.warn('Multiple Image Upload Skip', { url, error: error.message });
            // Continue with other images
        }
    }
    return results;
};

/**
 * Delete multiple images from Cloudinary
 * @param {string[]} publicIds 
 */
export const deleteMultipleImages = async (publicIds) => {
    for (const publicId of publicIds) {
        try {
            await deleteFromCloudinary(publicId);
        } catch (error) {
            Logger.warn('Cloudinary Delete Fail', { publicId, error: error.message });
        }
    }
};

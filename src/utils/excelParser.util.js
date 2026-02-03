import ExcelJS from 'exceljs';
import Logger from './logger.js';

/**
 * Parse Product Excel Buffer
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<{success: boolean, products: Array, errors: Array, message: string}>}
 */
export const parseProductExcel = async (buffer) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet('Products') || workbook.getWorksheet(1);

        if (!worksheet) {
            return { success: false, products: [], errors: [], message: 'Worksheet not found' };
        }

        const products = [];
        const errors = [];

        // Skip header and instruction rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 2) return;

            try {
                const data = {
                    name: row.getCell(1).text?.trim(),
                    description: row.getCell(2).text?.trim(),
                    categoryName: row.getCell(3).text?.trim(),
                    subCategoryName: row.getCell(4).text?.trim(),
                    brand: row.getCell(5).text?.trim(),
                    productType: row.getCell(6).text?.trim()?.toLowerCase() || 'physical',
                    unit: row.getCell(7).text?.trim(),
                    searchTags: row.getCell(8).text?.split(',').map(t => t.trim()).filter(Boolean) || [],
                    price: parseFloat(row.getCell(9).value) || 0,
                    purchasePrice: parseFloat(row.getCell(10).value) || 0,
                    tax: parseFloat(row.getCell(11).value) || 0,
                    taxType: row.getCell(12).text?.trim()?.toLowerCase() || 'percent',
                    discount: parseFloat(row.getCell(13).value) || 0,
                    discountType: row.getCell(14).text?.trim()?.toLowerCase() || 'percent',
                    shippingCost: parseFloat(row.getCell(15).value) || 0,
                    multiplyShippingCost: row.getCell(16).text?.toLowerCase() === 'true',
                    quantity: parseInt(row.getCell(17).value) || 0,
                    sku: row.getCell(18).text?.trim(),
                    colors: row.getCell(19).text?.split(',').map(c => c.trim()).filter(Boolean) || [],
                    _thumbnailUrl: row.getCell(20).text?.trim(),
                    _imageUrls: row.getCell(21).text?.split(',').map(u => u.trim()).filter(Boolean) || [],
                    videoLink: row.getCell(22).text?.trim(),
                    seo: {
                        metaTitle: row.getCell(23).text?.trim(),
                        metaDescription: row.getCell(24).text?.trim(),
                        metaImage: row.getCell(25).text?.trim() ? { url: row.getCell(25).text.trim() } : undefined
                    },
                    variationsJson: row.getCell(26).text?.trim(),
                    attributesJson: row.getCell(27).text?.trim()
                };

                // Basic validation
                if (!data.name || !data.description || !data.sku || isNaN(data.price)) {
                    errors.push({ row: rowNumber, error: 'Missing required fields (name, description, sku, price)' });
                    return;
                }

                // Parse Variations & Attributes JSON if present
                if (data.variationsJson) {
                    try { data.variations = JSON.parse(data.variationsJson); } catch (e) { errors.push({ row: rowNumber, error: 'Invalid Variations JSON' }); }
                }
                if (data.attributesJson) {
                    try { data.attributes = JSON.parse(data.attributesJson); } catch (e) { errors.push({ row: rowNumber, error: 'Invalid Attributes JSON' }); }
                }

                products.push(data);
            } catch (err) {
                errors.push({ row: rowNumber, error: err.message });
            }
        });

        return {
            success: errors.length === 0,
            products,
            errors,
            message: errors.length === 0 ? 'Success' : 'Validation failed'
        };
    } catch (error) {
        Logger.error('Excel Parsing Error', { error: error.message });
        return { success: false, products: [], errors: [{ error: error.message }], message: 'Failed to parse Excel file' };
    }
};

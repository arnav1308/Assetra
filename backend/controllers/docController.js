const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const llm = require('../services/llmEngine');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        let extractedText = '';
        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(req.file.path);
            const data = await pdfParse(dataBuffer);
            extractedText = data.text;
        } else {
            const ocrResult = await Tesseract.recognize(req.file.path, 'eng');
            extractedText = ocrResult.data.text;
            console.log(extractedText);
        }

        const llmResponse = await llm.invoke({
            input: extractedText
        });

        let responseContent = llmResponse.content;
        if (responseContent.startsWith('```json')) {
            responseContent = responseContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (responseContent.startsWith('```')) {
            responseContent = responseContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        let receiptData;
        try {
            receiptData = JSON.parse(responseContent);
        } catch (e) {
            console.error('Failed to parse LLM response:', responseContent);
            return res.status(500).json({ error: 'Failed to process receipt data from LLM.' });
        }

        // 1. Parse Purchase Date string safely
        const purchaseDateStr = receiptData.receipt?.purchase_date;
        const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;

        // 2. Create Document
        const document = await prisma.document.create({
            data: {
                userId: req.user.id,
                filename: req.file.originalname,
                filepath: req.file.filename,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                retailerName: receiptData.merchant?.name || null,
                shopAddress: receiptData.merchant?.address || null,
                gstin: receiptData.merchant?.gstin || null,
                billNumber: receiptData.receipt?.receipt_number || receiptData.receipt?.invoice_number || null,
                purchaseDate: purchaseDate,
                purchaseTime: receiptData.receipt?.purchase_time || null,
                paymentMethod: receiptData.receipt?.payment_method || null,
                subtotal: receiptData.receipt?.subtotal ? Number(receiptData.receipt.subtotal) : null,
                taxAmount: receiptData.receipt?.tax ? Number(receiptData.receipt.tax) : null,
                totalAmount: receiptData.receipt?.total_amount ? Number(receiptData.receipt.total_amount) : null
            }
        });

        const assets = [];
        // 3. Iterate items and create Assets
        if (receiptData.items && Array.isArray(receiptData.items)) {
            for (const item of receiptData.items) {
                if (!item.product_name) continue;

                const asset = await prisma.asset.create({
                    data: {
                        userId: req.user.id,
                        documentId: document.id,
                        name: item.product_name,
                        brand: item.brand,
                        category: item.category || 'Uncategorized',
                        purchasePrice: Number(item.total_price || item.unit_price || 0),
                        purchaseDate: purchaseDate || new Date(),
                        retailer: receiptData.merchant?.name,
                        gstin: receiptData.merchant?.gstin || null,
                        serialNumber: item.serial_number,
                        requiresWarranty: item.requires_warranty || false,
                        requiresReturnWindow: item.requires_return_window || false,
                        requiresSubscription: item.requires_subscription || false,
                        metadataJson: item.metadata ? JSON.stringify(item.metadata) : null
                    }
                });
                assets.push(asset);
            }
        }

        // 3. Create Transaction if a total amount exists
        if (receiptData.receipt?.total_amount) {
            const purchaseDateStr = receiptData.receipt?.purchase_date;
            const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();
            await prisma.transaction.create({
                data: {
                    userId: req.user.id,
                    amount: Number(receiptData.receipt.total_amount),
                    date: purchaseDate,
                    merchant: receiptData.merchant?.name || 'Unknown',
                    category: 'Shopping',
                    source: receiptData.receipt?.payment_method || 'Unknown'
                }
            });
        }

        res.status(200).json({ 
            message: 'Receipt processed successfully',
            document,
            assets,
            extractedData: receiptData 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.viewDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma.document.findUnique({ where: { id } });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (document.userId !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const filePath = path.join(__dirname, '../uploads', document.filepath);
        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', document.mimeType);
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.status(404).json({ message: 'File not found on disk' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const document = await prisma.document.findUnique({ where: { id } });
        if (!document) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        if (document.userId !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updated = await prisma.document.update({
            where: { id },
            data: {
                retailerName: updates.retailerName !== undefined ? updates.retailerName : document.retailerName,
                shopAddress: updates.shopAddress !== undefined ? updates.shopAddress : document.shopAddress,
                billNumber: updates.billNumber !== undefined ? updates.billNumber : document.billNumber,
                purchaseTime: updates.purchaseTime !== undefined ? updates.purchaseTime : document.purchaseTime,
                paymentMethod: updates.paymentMethod !== undefined ? updates.paymentMethod : document.paymentMethod,
                subtotal: updates.subtotal !== undefined ? Number(updates.subtotal) : document.subtotal,
                taxAmount: updates.taxAmount !== undefined ? Number(updates.taxAmount) : document.taxAmount,
                totalAmount: updates.totalAmount !== undefined ? Number(updates.totalAmount) : document.totalAmount
            }
        });

        res.status(200).json({ message: 'Receipt updated successfully', document: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma.document.findUnique({ where: { id } });

        if (!document) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        if (document.userId !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await prisma.document.delete({ where: { id } });
        // Assets are automatically deleted because of ON DELETE CASCADE

        res.status(200).json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

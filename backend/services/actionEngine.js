const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const evaluateUserActions = async (userId) => {
    // 1. Fetch user's assets
    const assets = await prisma.asset.findMany({
        where: { userId }
    });

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const asset of assets) {
        // Rule 1: Return Deadlines (within 7 days)
        if (asset.returnDeadline && asset.returnDeadline > now && asset.returnDeadline <= next7Days) {
            await createActionIfNotExists(userId, asset.id, 'RETURN_WINDOW', 'HIGH', 'Return Deadline Approaching', `Your return window for ${asset.name} closes on ${asset.returnDeadline.toLocaleDateString()}.`);
        }

        // Rule 2: Warranty Expiry (within 30 days)
        if (asset.warrantyExpiry && asset.warrantyExpiry > now && asset.warrantyExpiry <= next30Days) {
            await createActionIfNotExists(userId, asset.id, 'WARRANTY_EXPIRY', 'MEDIUM', 'Warranty Expiring Soon', `Your warranty for ${asset.name} expires on ${asset.warrantyExpiry.toLocaleDateString()}.`);
        }

        // Rule 3: Purchase Advantage (currentPrice > purchasePrice)
        if (asset.currentPrice && asset.currentPrice > asset.purchasePrice) {
            const advantage = asset.currentPrice - asset.purchasePrice;
            await createActionIfNotExists(userId, asset.id, 'PRICE_ADVANTAGE', 'LOW', 'Price Increased', `The market value of ${asset.name} is ₹${advantage} higher than your purchase price.`, advantage);
        }
    }
};

// Helper function to prevent duplicate actions
const   createActionIfNotExists = async (userId, assetId, type, urgency, title, description, financialValue = 0) => {
    const existingAction = await prisma.action.findFirst({
        where: {
            userId,
            assetId,
            type,
            status: { notIn: ['DISMISSED', 'RESOLVED'] }
        }
    });

    if (!existingAction) {
        await prisma.action.create({
            data: {
                userId,
                assetId,
                type,
                urgency,
                title,
                description,
                financialValue,
                status: 'PENDING'
            }
        });
    }
};

module.exports = {
    evaluateUserActions
};

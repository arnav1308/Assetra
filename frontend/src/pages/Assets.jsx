import React, { useState, useEffect, useMemo } from 'react';
import { Package, Calendar, Tag, IndianRupee, X, ExternalLink, ShieldCheck, AlertTriangle, FileText, Trash2, Receipt, Pencil } from 'lucide-react';
import api from '../services/api';

export default function AssetsPage() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [editingAsset, setEditingAsset] = useState(null);
    const [editAssetFormData, setEditAssetFormData] = useState({});

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const response = await api.get('/api/assets');
            setAssets(response.data);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAsset = async (assetId) => {
        if (!window.confirm("Are you sure you want to delete this asset permanently?")) return;
        try {
            await api.delete(`/api/assets/${assetId}`);
            setAssets(prev => prev.filter(a => a.id !== assetId));

            if (selectedReceipt) {
                const updatedAssets = selectedReceipt.assets.filter(a => a.id !== assetId);
                if (updatedAssets.length === 0) {
                    setSelectedReceipt(null);
                } else {
                    setSelectedReceipt({
                        ...selectedReceipt,
                        assets: updatedAssets
                    });
                }
            }
        } catch (error) {
            console.error('Failed to delete asset:', error);
            alert("Failed to delete asset.");
        }
    };

    const handleDeleteReceipt = async (receiptId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this receipt AND all its items permanently?")) return;
        try {
            await api.delete(`/api/documents/${receiptId}`);
            // Force a re-fetch since assets are cascaded
            fetchAssets();
            if (selectedReceipt && selectedReceipt.document.id === receiptId) {
                setSelectedReceipt(null);
            }
        } catch (error) {
            console.error('Failed to delete receipt:', error);
            alert("Failed to delete receipt.");
        }
    };

    const handleEditReceipt = (group, e) => {
        e.stopPropagation();
        setEditingReceipt(group);
        setEditFormData({
            retailerName: group.document.retailerName || '',
            shopAddress: group.document.shopAddress || '',
            billNumber: group.document.billNumber || '',
            purchaseTime: group.document.purchaseTime || '',
            paymentMethod: group.document.paymentMethod || '',
            subtotal: group.document.subtotal || '',
            taxAmount: group.document.taxAmount || '',
            totalAmount: group.document.totalAmount || ''
        });
    };

    const submitEditReceipt = async (e) => {
        e.preventDefault();
        try {
            const response = await api.put(`/api/documents/${editingReceipt.document.id}`, editFormData);
            setEditingReceipt(null);
            // Re-fetch to get updated state
            fetchAssets();
        } catch (error) {
            console.error('Failed to update receipt:', error);
            alert("Failed to update receipt.");
        }
    };

    const handleEditAsset = (asset, e) => {
        e.stopPropagation();
        setEditingAsset(asset);
        setEditAssetFormData({
            name: asset.name || '',
            brand: asset.brand || '',
            category: asset.category || '',
            purchasePrice: asset.purchasePrice || '',
            serialNumber: asset.serialNumber || '',
            warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
            returnWindowExpiry: asset.returnWindowExpiry ? new Date(asset.returnWindowExpiry).toISOString().split('T')[0] : '',
            subscriptionRenewal: asset.subscriptionRenewal ? new Date(asset.subscriptionRenewal).toISOString().split('T')[0] : ''
        });
    };

    const submitEditAsset = async (e) => {
        e.preventDefault();
        try {
            const response = await api.put(`/api/assets/${editingAsset.id}`, editAssetFormData);
            setEditingAsset(null);
            fetchAssets();
            if (selectedReceipt) {
                const updatedAssets = selectedReceipt.assets.map(a => a.id === editingAsset.id ? response.data.asset : a);
                setSelectedReceipt({ ...selectedReceipt, assets: updatedAssets });
            }
        } catch (error) {
            console.error('Failed to update asset:', error);
            alert("Failed to update asset.");
        }
    };

    const detectMissingAssetData = (asset) => {
        if (!asset) return [];
        const missing = [];
        if (!asset.brand || asset.brand === 'N/A' || asset.brand.toLowerCase() === 'unknown') missing.push({ key: 'brand', label: 'Brand Name' });
        if (!asset.name || asset.name === 'N/A') missing.push({ key: 'name', label: 'Asset Name' });
        if (!asset.category) missing.push({ key: 'category', label: 'Category' });
        if (!asset.purchasePrice && asset.purchasePrice !== 0) missing.push({ key: 'purchasePrice', label: 'Purchase Price' });
        return missing;
    };

    const detectMissingData = (document) => {
        if (!document) return [];
        const missing = [];
        if (!document.retailerName || document.retailerName.toLowerCase().includes('unknown')) missing.push({ key: 'retailerName', label: 'Retailer Name' });
        if (!document.shopAddress) missing.push({ key: 'shopAddress', label: 'Shop Address' });
        if (!document.billNumber) missing.push({ key: 'billNumber', label: 'Bill/Invoice Number' });
        if (!document.purchaseTime) missing.push({ key: 'purchaseTime', label: 'Purchase Time' });
        if (!document.paymentMethod) missing.push({ key: 'paymentMethod', label: 'Payment Method' });
        if (!document.totalAmount && document.totalAmount !== 0) missing.push({ key: 'totalAmount', label: 'Total Amount' });
        return missing;
    };

    const groupedReceipts = useMemo(() => {
        const map = new Map();
        assets.forEach(asset => {
            if (asset.document) {
                const docId = asset.document.id;
                if (!map.has(docId)) {
                    map.set(docId, {
                        document: asset.document,
                        assets: []
                    });
                }
                map.get(docId).assets.push(asset);
            } else {
                const manualId = `manual-${asset.id}`;
                map.set(manualId, {
                    document: {
                        id: manualId,
                        retailerName: asset.retailer || 'Manual Entry',
                        purchaseDate: asset.purchaseDate,
                        totalAmount: asset.purchasePrice,
                        isManual: true
                    },
                    assets: [asset]
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.document.purchaseDate) - new Date(a.document.purchaseDate));
    }, [assets]);

    const getMetadata = (jsonString) => {
        if (!jsonString) return {};
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return {};
        }
    };

    const shouldShowMetadata = (category) => {
        const categories = ['Electronics', 'Appliances', 'Vehicles'];
        return categories.some(c => category.toLowerCase().includes(c.toLowerCase()));
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Assets & Receipts</h1>
                        <p className="text-slate-400">Manage your purchased items grouped by receipt.</p>
                    </div>
                </div>

                {groupedReceipts.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                        <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">No assets yet</h3>
                        <p className="text-slate-400">Upload a receipt or add an asset manually to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedReceipts.map((group) => {
                            const { document, assets: groupAssets } = group;
                            const totalAmount = document.totalAmount || groupAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
                            const topItems = groupAssets.slice(0, 2);
                            const remainingCount = groupAssets.length - topItems.length;
                            const missingData = document.isManual ? [] : detectMissingData(document);

                            return (
                                <div
                                    key={document.id}
                                    onClick={() => setSelectedReceipt(group)}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer group relative"
                                >
                                    {!document.isManual && (
                                        <div className="absolute top-4 right-4 flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleEditReceipt(group, e)}
                                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/20"
                                                title="Edit Receipt Details"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteReceipt(document.id, e)}
                                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 border border-red-500/20"
                                                title="Delete Receipt"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4 pr-16">
                                        <div className="p-3 bg-slate-800 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                            {document.isManual ? <Package className="w-6 h-6 text-emerald-400" /> : <Receipt className="w-6 h-6 text-blue-400" />}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-semibold text-white mb-2 truncate">
                                        {document.retailerName || 'Unknown Retailer'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400 mb-4">
                                        <Calendar className="w-4 h-4 shrink-0" />
                                        <span>{new Date(document.purchaseDate).toLocaleDateString()}</span>

                                        {!document.isManual && document.billNumber && (
                                            <>
                                                <span className="text-slate-600">•</span>
                                                <span className="truncate">Bill: {document.billNumber}</span>
                                            </>
                                        )}

                                        <div className="w-full">
                                            <span className="text-xl font-medium text-emerald-400">
                                                ₹{totalAmount.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    {missingData.length > 0 && (
                                        <div className="mb-4">
                                            <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>Missing {missingData.length} field{missingData.length > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Smart Preview */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Includes Items</p>
                                        <div className="flex flex-wrap gap-2">
                                            {topItems.map(item => (
                                                <span key={item.id} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md border border-slate-700 truncate max-w-[150px]">
                                                    {item.name}
                                                </span>
                                            ))}
                                            {remainingCount > 0 && (
                                                <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-md border border-blue-500/20 font-medium">
                                                    +{remainingCount} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Receipt Modal */}
            {editingReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl shadow-black overflow-hidden flex flex-col">
                        <div className="bg-slate-900/95 border-b border-slate-800 p-6 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                                    <Pencil className="text-blue-400" />
                                    Edit Receipt Details
                                </h2>
                            </div>
                            <button
                                onClick={() => setEditingReceipt(null)}
                                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {detectMissingData(editingReceipt.document).length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start">
                                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-amber-400 font-medium mb-1">Missing Data Detected</h4>
                                        <p className="text-slate-300 text-sm mb-3">Please fill in the missing fields below to improve your records.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {detectMissingData(editingReceipt.document).map((m, i) => (
                                                <span key={i} className="bg-amber-500/20 text-amber-200 text-xs px-2 py-1 rounded">
                                                    {m.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form id="edit-receipt-form" onSubmit={submitEditReceipt} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Retailer Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.retailerName}
                                        onChange={e => setEditFormData({ ...editFormData, retailerName: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editFormData.retailerName ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. Amazon, Best Buy"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Bill/Invoice Number</label>
                                    <input
                                        type="text"
                                        value={editFormData.billNumber}
                                        onChange={e => setEditFormData({ ...editFormData, billNumber: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editFormData.billNumber ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. INV-12345"
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-400">Shop Address</label>
                                    <input
                                        type="text"
                                        value={editFormData.shopAddress}
                                        onChange={e => setEditFormData({ ...editFormData, shopAddress: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editFormData.shopAddress ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. 123 Main St, City, Country"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Purchase Time</label>
                                    <input
                                        type="text"
                                        value={editFormData.purchaseTime}
                                        onChange={e => setEditFormData({ ...editFormData, purchaseTime: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editFormData.purchaseTime ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. 14:30"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Payment Method</label>
                                    <input
                                        type="text"
                                        value={editFormData.paymentMethod}
                                        onChange={e => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editFormData.paymentMethod ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. Credit Card, UPI"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Subtotal (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editFormData.subtotal}
                                        onChange={e => setEditFormData({ ...editFormData, subtotal: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Tax Amount (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editFormData.taxAmount}
                                        onChange={e => setEditFormData({ ...editFormData, taxAmount: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-400">Total Amount (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editFormData.totalAmount}
                                        onChange={e => setEditFormData({ ...editFormData, totalAmount: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editFormData.totalAmount ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="bg-slate-900 border-t border-slate-800 p-6 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setEditingReceipt(null)}
                                className="px-5 py-2.5 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-receipt-form"
                                className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Asset Modal */}
            {editingAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl shadow-black overflow-hidden flex flex-col">
                        <div className="bg-slate-900/95 border-b border-slate-800 p-6 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                                    <Pencil className="text-blue-400" />
                                    Edit Asset Details
                                </h2>
                            </div>
                            <button
                                onClick={() => setEditingAsset(null)}
                                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {detectMissingAssetData(editingAsset).length > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-4 items-start">
                                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-amber-400 font-medium mb-1">Missing Data Detected</h4>
                                        <p className="text-slate-300 text-sm mb-3">Please fill in the missing fields below to improve your records.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {detectMissingAssetData(editingAsset).map((m, i) => (
                                                <span key={i} className="bg-amber-500/20 text-amber-200 text-xs px-2 py-1 rounded">
                                                    {m.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form id="edit-asset-form" onSubmit={submitEditAsset} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Asset Name</label>
                                    <input
                                        type="text"
                                        value={editAssetFormData.name}
                                        onChange={e => setEditAssetFormData({ ...editAssetFormData, name: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editAssetFormData.name || editAssetFormData.name === 'N/A' ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. MacBook Pro"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Brand</label>
                                    <input
                                        type="text"
                                        value={editAssetFormData.brand}
                                        onChange={e => setEditAssetFormData({ ...editAssetFormData, brand: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editAssetFormData.brand || editAssetFormData.brand.toLowerCase() === 'n/a' ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. Apple"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Category</label>
                                    <input
                                        type="text"
                                        value={editAssetFormData.category}
                                        onChange={e => setEditAssetFormData({ ...editAssetFormData, category: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editAssetFormData.category ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                        placeholder="e.g. Electronics"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Purchase Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editAssetFormData.purchasePrice}
                                        onChange={e => setEditAssetFormData({ ...editAssetFormData, purchasePrice: e.target.value })}
                                        className={`w-full bg-slate-800 border ${!editAssetFormData.purchasePrice && editAssetFormData.purchasePrice !== 0 ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-700 focus:border-blue-500'} rounded-lg p-2.5 text-white outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-400">Serial Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={editAssetFormData.serialNumber}
                                        onChange={e => setEditAssetFormData({ ...editAssetFormData, serialNumber: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                                {editingAsset.requiresWarranty && editingAsset.category !== 'Food & Dining' && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-400">Warranty Expiry</label>
                                        <input
                                            type="date"
                                            value={editAssetFormData.warrantyExpiry}
                                            onChange={e => setEditAssetFormData({ ...editAssetFormData, warrantyExpiry: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                    </div>
                                )}
                                {editingAsset.requiresReturnWindow && editingAsset.category !== 'Food & Dining' && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-400">Return Window Expiry</label>
                                        <input
                                            type="date"
                                            value={editAssetFormData.returnWindowExpiry}
                                            onChange={e => setEditAssetFormData({ ...editAssetFormData, returnWindowExpiry: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                    </div>
                                )}
                                {editingAsset.requiresSubscription && editingAsset.category !== 'Food & Dining' && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-400">Subscription Renewal</label>
                                        <input
                                            type="date"
                                            value={editAssetFormData.subscriptionRenewal}
                                            onChange={e => setEditAssetFormData({ ...editAssetFormData, subscriptionRenewal: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        />
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="bg-slate-900 border-t border-slate-800 p-6 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setEditingAsset(null)}
                                className="px-5 py-2.5 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-asset-form"
                                className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2"
                            >
                                Save Asset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Receipt View Modal */}
            {selectedReceipt && !editingReceipt && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black flex flex-col">
                        <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-6 flex justify-between items-center z-10 shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    {selectedReceipt.document.isManual ? <Package className="text-emerald-400" /> : <Receipt className="text-blue-400" />}
                                    {selectedReceipt.document.retailerName || 'Receipt Details'}
                                </h2>
                                <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(selectedReceipt.document.purchaseDate).toLocaleDateString()}
                                    {!selectedReceipt.document.isManual && selectedReceipt.document.billNumber && (
                                        <span>• Bill No: {selectedReceipt.document.billNumber}</span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8 flex-1">
                            {/* Receipt Level Metadata (Only if not manual) */}
                            {!selectedReceipt.document.isManual && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                                        <h4 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wider">Transaction Info</h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                                <span className="text-slate-400">Time</span>
                                                <span className="text-slate-200 font-medium">{selectedReceipt.document.purchaseTime || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                                <span className="text-slate-400">Payment</span>
                                                <span className="text-slate-200 font-medium">{selectedReceipt.document.paymentMethod || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col border-b border-slate-700/50 pb-2">
                                                <span className="text-slate-400 mb-1">Address</span>
                                                <span className="text-slate-200 font-medium break-words">{selectedReceipt.document.shopAddress || 'Address unavailable'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 md:col-span-2">
                                        <h4 className="text-slate-400 text-sm font-medium mb-3 uppercase tracking-wider">Receipt Financials</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 flex flex-col justify-center">
                                                <p className="text-slate-400 mb-1">Subtotal</p>
                                                <p className="font-medium text-slate-200 text-lg">{selectedReceipt.document.subtotal ? `₹${selectedReceipt.document.subtotal.toFixed(2)}` : 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 flex flex-col justify-center">
                                                <p className="text-slate-400 mb-1">Tax Amount</p>
                                                <p className="font-medium text-slate-200 text-lg">{selectedReceipt.document.taxAmount ? `₹${selectedReceipt.document.taxAmount.toFixed(2)}` : 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded-lg border border-emerald-500/20 flex flex-col justify-center col-span-2 md:col-span-1">
                                                <p className="text-slate-400 mb-1">Total Paid</p>
                                                <p className="font-bold text-emerald-400 text-2xl">{selectedReceipt.document.totalAmount ? `₹${selectedReceipt.document.totalAmount.toFixed(2)}` : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Individual Assets Breakdown */}
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4 border-b border-slate-800 pb-2">Items Purchased ({selectedReceipt.assets.length})</h3>
                                <div className="space-y-4">
                                    {selectedReceipt.assets.map(asset => (
                                        <div key={asset.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 hover:bg-slate-800/60 transition-colors group">
                                            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="text-lg font-semibold text-white">{asset.name}</h4>
                                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                                                            {asset.category}
                                                        </span>
                                                        {((!asset.brand || asset.brand === 'N/A' || asset.brand.toLowerCase() === 'unknown') || (!asset.name || asset.name === 'N/A') || (!asset.category) || (!asset.purchasePrice && asset.purchasePrice !== 0) || (asset.requiresWarranty && !asset.warrantyExpiry) || (asset.requiresReturnWindow && !asset.returnWindowExpiry) || (asset.requiresSubscription && !asset.subscriptionRenewal)) && (
                                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {((asset.requiresWarranty && !asset.warrantyExpiry) || (asset.requiresReturnWindow && !asset.returnWindowExpiry) || (asset.requiresSubscription && !asset.subscriptionRenewal)) ? 'Action Info Needed' : 'Missing Brand/Data'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 text-sm mb-3">Brand: <span className="text-slate-300">{asset.brand || 'N/A'}</span></p>

                                                    {/* Predictive Warnings */}
                                                    {(asset.requiresWarranty && !asset.warrantyExpiry) || (asset.requiresReturnWindow && !asset.returnWindowExpiry) || (asset.requiresSubscription && !asset.subscriptionRenewal) ? (
                                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                            <div className="text-sm">
                                                                <p className="text-amber-300 font-medium mb-1">Action Recommended</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {asset.requiresWarranty && !asset.warrantyExpiry && <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/20">Add Warranty Date</span>}
                                                                    {asset.requiresReturnWindow && !asset.returnWindowExpiry && <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/20">Add Return Date</span>}
                                                                    {asset.requiresSubscription && !asset.subscriptionRenewal && <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/20">Add Renewal Date</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {/* Asset Metadata inline if applicable */}
                                                    {shouldShowMetadata(asset.category) && (
                                                        <div className="bg-slate-900/60 p-3 rounded-lg text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 border border-slate-700/50">
                                                            {asset.serialNumber && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-500">S/N:</span>
                                                                    <span className="text-slate-300">{asset.serialNumber}</span>
                                                                </div>
                                                            )}
                                                            {Object.entries(getMetadata(asset.metadataJson)).map(([key, value]) => (
                                                                <div key={key} className="flex justify-between">
                                                                    <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                                    <span className="text-slate-300">{value?.toString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2">
                                                    <div className="text-right">
                                                        <p className="text-sm text-slate-400 mb-0.5">Price</p>
                                                        <p className="font-bold text-emerald-400 text-xl">₹{parseFloat(asset.purchasePrice).toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => handleEditAsset(asset, e)}
                                                            className="p-2 md:opacity-0 md:group-hover:opacity-100 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all text-blue-400 border border-blue-500/20"
                                                            title="Edit Item"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteAsset(asset.id);
                                                            }}
                                                            className="p-2 md:opacity-0 md:group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all text-red-400 border border-red-500/20"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

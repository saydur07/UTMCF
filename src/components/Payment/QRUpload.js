// src/components/Payment/QRUpload.js
import React, { useState } from 'react';
import './QRUpload.css';

// Cloudinary configuration
const CLOUD_NAME = "dh4zcjn4r";
const UPLOAD_PRESET = "happ2zxv";

const QRUpload = ({ onQRCodesChange, existingQRCodes = [] }) => {
    const [qrCodes, setQrCodes] = useState(existingQRCodes);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const uploadToCloudinary = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    };

    const handleQRImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size should be less than 5MB');
            return;
        }

        try {
            setUploading(true);
            setError('');

            const imageUrl = await uploadToCloudinary(file);

            // Create new QR code entry
            const newQRCode = {
                imageUrl,
                bankName: '',
                accountHolder: '',
                accountNumber: ''
            };

            const updatedQRCodes = [...qrCodes, newQRCode];
            setQrCodes(updatedQRCodes);
            onQRCodesChange(updatedQRCodes);

            // Reset file input
            e.target.value = '';
            setUploading(false);
        } catch (error) {
            setError('Failed to upload QR code image. Please try again.');
            setUploading(false);
        }
    };

    const updateQRCode = (index, field, value) => {
        const updatedQRCodes = qrCodes.map((qr, i) =>
            i === index ? { ...qr, [field]: value } : qr
        );
        setQrCodes(updatedQRCodes);
        onQRCodesChange(updatedQRCodes);
    };

    const removeQRCode = (index) => {
        const updatedQRCodes = qrCodes.filter((_, i) => i !== index);
        setQrCodes(updatedQRCodes);
        onQRCodesChange(updatedQRCodes);
    };

    return (
        <div className="qr-upload-container">
            <div className="qr-upload-header">
                <p className="qr-description">
                    Upload QR codes from your banking apps (Maybank2u, CIMB Clicks, Touch 'n Go eWallet, etc.)
                </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Upload New QR Code */}
            <div className="qr-upload-section">
                <label htmlFor="qr-upload" className="qr-upload-button">
                    {uploading ? (
                        <span>📤 Uploading...</span>
                    ) : (
                        <span>📱 Add QR Code</span>
                    )}
                </label>
                <input
                    type="file"
                    id="qr-upload"
                    accept="image/*"
                    onChange={handleQRImageUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                />
                <p className="upload-help">
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                </p>
            </div>

            {/* Display Existing QR Codes */}
            {qrCodes.length > 0 && (
                <div className="qr-codes-list">
                    <h4>Your Payment QR Codes:</h4>
                    {qrCodes.map((qrCode, index) => (
                        <div key={index} className="qr-code-item">
                            <div className="qr-code-preview">
                                <img
                                    src={qrCode.imageUrl}
                                    alt={`QR Code ${index + 1}`}
                                    className="qr-image"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeQRCode(index)}
                                    className="remove-qr-btn"
                                    title="Remove QR Code"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="qr-code-details">
                                <div className="form-group">
                                    <label>Bank Name *</label>
                                    <input
                                        type="text"
                                        value={qrCode.bankName}
                                        onChange={(e) => updateQRCode(index, 'bankName', e.target.value)}
                                        placeholder="e.g., Maybank, CIMB, Public Bank"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Account Holder Name *</label>
                                    <input
                                        type="text"
                                        value={qrCode.accountHolder}
                                        onChange={(e) => updateQRCode(index, 'accountHolder', e.target.value)}
                                        placeholder="Full name as per bank account"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Account Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={qrCode.accountNumber}
                                        onChange={(e) => updateQRCode(index, 'accountNumber', e.target.value)}
                                        placeholder="For buyer reference"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {qrCodes.length === 0 && (
                <div className="no-qr-codes">
                    <div className="empty-state">
                        <div className="empty-icon">💳</div>
                        <h4>No QR Codes Added Yet</h4>
                        <p>Add QR codes to allow buyers to pay you instantly via mobile banking apps</p>
                    </div>
                </div>
            )}

            {qrCodes.length > 0 && (
                <div className="qr-codes-summary">
                    <div className="summary-info">
                        ✅ {qrCodes.length} payment method{qrCodes.length !== 1 ? 's' : ''} added
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRUpload;
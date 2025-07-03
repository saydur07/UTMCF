// src/components/Payment/CampaignQRPayment.js - FIXED VERSION that creates orders for chat system
import React, { useState, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useCampaign } from '../../context/CampaignContext';
import './CampaignQRPayment.css';

const CampaignQRPayment = ({ campaign, onClose, onPaymentSuccess }) => {
    const [currentStep, setCurrentStep] = useState('qr'); // 'qr' or 'receipt'
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [receiptImage, setReceiptImage] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [formData, setFormData] = useState({
        donorName: '',
        donorPhone: '',
        donorEmail: auth.currentUser?.email || '',
        donationAmount: '',
        referenceNumber: '',
        message: ''
    });

    const fileInputRef = useRef(null);
    const user = auth.currentUser;
    const { addDonation } = useCampaign();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, etc.)');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setReceiptImage(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setReceiptPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    // Upload receipt to Cloudinary (same as ProductQRPayment)
    const uploadReceiptToCloudinary = async (file) => {
        const CLOUD_NAME = "dh4zcjn4r";
        const UPLOAD_PRESET = "happ2zxv";

        try {
            console.log('📤 Uploading donation receipt to Cloudinary...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cloudinary error:', errorData);
                throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('✅ Receipt uploaded successfully to Cloudinary:', data.secure_url);
            return data.secure_url;
        } catch (error) {
            console.error('❌ Error uploading receipt to Cloudinary:', error);
            throw error;
        }
    };

    // FIXED: Create donation order that integrates with existing chat system
    const createDonationOrder = async (donationData, receiptImageUrl) => {
        try {
            console.log('📧 Creating donation order for chat system...');

            // Create order data that looks like a marketplace order but for donations
            const orderData = {
                // Buyer/Donor information
                buyerId: user.uid,
                buyerName: formData.donorName.trim(),
                buyerEmail: formData.donorEmail || user.email,
                buyerPhone: formData.donorPhone.trim(),

                // Seller/Campaign Creator information
                sellerId: campaign.creator.id,
                sellerName: campaign.creator.name || campaign.creator.email,
                sellerEmail: campaign.creator.email,

                // NEW: Mark this as a donation order
                orderType: 'donation', // This distinguishes it from marketplace orders

                // Campaign information (instead of items)
                campaignId: campaign.id,
                campaignTitle: campaign.title,
                donationAmount: parseFloat(formData.donationAmount),

                // Keep items structure for compatibility but use donation data
                items: [
                    {
                        id: `donation-${Date.now()}`,
                        name: `Donation to: ${campaign.title}`,
                        price: parseFloat(formData.donationAmount),
                        quantity: 1,
                        type: 'donation',
                        campaignId: campaign.id,
                        images: campaign.images || []
                    }
                ],

                totalAmount: parseFloat(formData.donationAmount),
                paymentMethod: 'donation_qr',
                status: 'pending_verification', // Special status for donations

                // Payment information
                paymentDetails: {
                    method: 'qr_code_donation',
                    referenceNumber: formData.referenceNumber.trim(),
                    receiptImageUrl: receiptImageUrl,
                    donorMessage: formData.message.trim(),
                    submittedAt: new Date()
                },

                // Timestamps
                createdAt: new Date(),
                lastUpdated: new Date(),

                // FIXED: Initial message with receipt for chat system
                messages: [
                    {
                        senderId: user.uid,
                        senderName: formData.donorName.trim(),
                        senderType: 'donor',
                        message: `🎉 New donation received for your campaign "${campaign.title}"!\n\n💰 Amount: RM ${parseFloat(formData.donationAmount).toFixed(2)}${formData.referenceNumber.trim() ? `\n📄 Reference: ${formData.referenceNumber.trim()}` : ''}${formData.message.trim() ? `\n💬 Message: "${formData.message.trim()}"` : ''}\n\n📸 Payment receipt has been uploaded for your verification.\n\nPlease verify this donation to confirm it.`,
                        timestamp: new Date(),
                        read: false,
                        attachments: [
                            {
                                type: 'image',
                                url: receiptImageUrl,
                                filename: receiptImage.name,
                                caption: 'Donation Payment Receipt'
                            }
                        ]
                    }
                ]
            };

            console.log('📋 Creating donation order in orders collection...');
            const orderRef = await addDoc(collection(db, 'orders'), orderData);
            console.log('✅ Donation order created:', orderRef.id);

            return orderRef.id;
        } catch (error) {
            console.error('❌ Error creating donation order:', error);
            throw error;
        }
    };

    const handleSubmitDonation = async () => {
        if (!user) {
            alert('Please login to continue');
            return;
        }

        if (!receiptImage) {
            alert('Please upload a payment receipt');
            return;
        }

        if (!formData.donorName.trim()) {
            alert('Please enter your name');
            return;
        }

        if (!formData.donorPhone.trim()) {
            alert('Please enter your phone number');
            return;
        }

        if (!formData.donationAmount || parseFloat(formData.donationAmount) <= 0) {
            alert('Please enter a valid donation amount');
            return;
        }

        try {
            setSubmitting(true);
            console.log('🔄 Starting donation submission process...');

            // Upload receipt image to Cloudinary
            console.log('📤 Step 1: Uploading receipt to Cloudinary...');
            let receiptImageUrl = null;

            try {
                receiptImageUrl = await uploadReceiptToCloudinary(receiptImage);
                console.log('✅ Receipt uploaded successfully:', receiptImageUrl);
            } catch (uploadError) {
                console.error('❌ Receipt upload failed:', uploadError);
                alert(`Failed to upload receipt: ${uploadError.message}`);
                setSubmitting(false);
                return;
            }

            // Create donation data with receipt
            console.log('📝 Step 2: Creating donation data...');
            const donationData = {
                amount: parseFloat(formData.donationAmount),
                donorName: formData.donorName.trim(),
                donorPhone: formData.donorPhone.trim(),
                donorEmail: formData.donorEmail || user.email,
                donorId: user.uid,
                referenceNumber: formData.referenceNumber.trim(),
                message: formData.message.trim(),
                paymentMethod: 'qr_scan_with_receipt',

                // Receipt information
                receiptImageUrl: receiptImageUrl,
                receiptFileName: receiptImage.name,

                // Status
                status: 'pending_verification', // Campaign creator needs to verify

                // Timestamps
                timestamp: new Date(),
                submittedAt: new Date()
            };

            // Update campaign with pending donation
            console.log('💾 Step 3: Adding donation to campaign...');
            const campaignRef = doc(db, 'campaigns', campaign.id);

            await updateDoc(campaignRef, {
                donations: arrayUnion(donationData),
                // Don't increment currentAmount yet - wait for verification
                donationCount: increment(1), // Count submitted donations
                lastDonation: new Date()
            });

            //  Create donation order for chat system integration
            console.log('📧 Step 4: Creating donation order for chat system...');
            await createDonationOrder(donationData, receiptImageUrl);

            // all success callback
            console.log('🎉 Step 5: Donation submitted successfully!');

            // Call the success callback with donation info
            onPaymentSuccess({
                amount: parseFloat(formData.donationAmount),
                donorName: formData.donorName.trim(),
                referenceNumber: formData.referenceNumber.trim(),
                message: formData.message.trim(),
                receiptImageUrl: receiptImageUrl,
                status: 'pending_verification'
            });

        } catch (error) {
            console.error('❌ Donation submission error:', error);

            if (error.code === 'permission-denied') {
                alert('Permission denied. Please check your login status and try again.');
            } else if (error.code === 'unavailable') {
                alert('Service temporarily unavailable. Please try again in a moment.');
            } else {
                alert(`Failed to process donation: ${error.message}`);
            }
        } finally {
            setSubmitting(false);
            console.log('🔄 Donation submission process completed');
        }
    };

    const proceedToReceipt = () => {
        setCurrentStep('receipt');
    };

    const goBackToQR = () => {
        setCurrentStep('qr');
    };

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Get valid QR codes
    const validQRCodes = campaign.qrCodes?.filter(qr => qr.imageUrl && qr.bankName) || [];

    return (
        <div className="campaign-qr-payment-overlay">
            <div className="campaign-qr-payment-modal">
                {currentStep === 'qr' ? (
                    // QR Code Display Step
                    <>
                        <div className="qr-header">
                            <h2>💳 Donate via QR Code</h2>
                            <p>Scan the QR code below to donate to "{campaign.title}"</p>
                            <button className="close-btn" onClick={onClose}>✕</button>
                        </div>

                        <div className="campaign-qr-section">
                            {validQRCodes.length > 0 ? (
                                validQRCodes.map((qrCode, index) => (
                                    <div key={index} className="qr-code-display">
                                        <div className="qr-image-container">
                                            <img
                                                src={qrCode.imageUrl}
                                                alt={`QR Code for ${qrCode.bankName}`}
                                                className="qr-image"
                                                onError={(e) => {
                                                    console.error('❌ Failed to load QR code:', qrCode.imageUrl);
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
                                                }}
                                            />
                                            <div className="qr-fallback" style={{ display: 'none' }}>
                                                <span>❌ QR Code not available</span>
                                            </div>
                                        </div>

                                        <div className="qr-details">
                                            <h4>{qrCode.bankName}</h4>
                                            <p><strong>Account Holder:</strong> {qrCode.accountHolder}</p>
                                            {qrCode.accountNumber && (
                                                <p><strong>Account Number:</strong> {qrCode.accountNumber}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-qr-codes">
                                    <span>⚠️</span>
                                    <h3>Payment Methods Not Available</h3>
                                    <p>The campaign creator hasn't set up payment methods yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="campaign-info-summary">
                            <h3>📋 Campaign Information</h3>
                            <div className="info-row">
                                <span>Campaign:</span>
                                <span>{campaign.title}</span>
                            </div>
                            <div className="info-row">
                                <span>Goal:</span>
                                <span>{formatCurrency(campaign.goalAmount)}</span>
                            </div>
                            <div className="info-row">
                                <span>Raised so far:</span>
                                <span>{formatCurrency(campaign.currentAmount || 0)}</span>
                            </div>
                        </div>

                        <div className="payment-instructions">
                            <h3>📱 How to Donate:</h3>
                            <ol>
                                <li>Open your banking app or e-wallet</li>
                                <li>Scan the QR code above</li>
                                <li>Enter your donation amount</li>
                                <li>Complete the payment</li>
                                <li>Take a screenshot of the payment receipt</li>
                                <li>Click "I Have Donated" below</li>
                            </ol>
                        </div>

                        <div className="action-buttons">
                            <button className="back-btn" onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                className="donated-btn"
                                onClick={proceedToReceipt}
                                disabled={validQRCodes.length === 0}
                            >
                                💝 I Have Donated
                            </button>
                        </div>
                    </>
                ) : (
                    // Receipt Upload Step
                    <>
                        <div className="receipt-header">
                            <h2>📸 Upload Donation Receipt</h2>
                            <p>Please upload your payment receipt and fill in your donation details</p>
                            <button className="close-btn" onClick={onClose}>✕</button>
                        </div>

                        <div className="receipt-upload-section">
                            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                                {receiptPreview ? (
                                    <div className="receipt-preview">
                                        <img src={receiptPreview} alt="Receipt preview" />
                                        <div className="receipt-overlay">
                                            <span>📸 Click to change receipt</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="upload-placeholder">
                                        <div className="upload-icon">📸</div>
                                        <h3>Upload Payment Receipt</h3>
                                        <p>Click here to select your donation receipt image</p>
                                        <small>Supports: JPG, PNG (Max 5MB)</small>
                                    </div>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <form className="donation-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        name="donorName"
                                        value={formData.donorName}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="donorPhone"
                                        value={formData.donorPhone}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 012-345-6789"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="donorEmail"
                                        value={formData.donorEmail}
                                        onChange={handleInputChange}
                                        placeholder="your.email@example.com"
                                        readOnly
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Donation Amount (RM) *</label>
                                    <input
                                        type="number"
                                        name="donationAmount"
                                        value={formData.donationAmount}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 100.00"
                                        min="1"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Transaction Reference (Optional)</label>
                                <input
                                    type="text"
                                    name="referenceNumber"
                                    value={formData.referenceNumber}
                                    onChange={handleInputChange}
                                    placeholder="e.g., TXN123456789"
                                />
                            </div>

                            <div className="form-group">
                                <label>Message to Campaign Creator (Optional)</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    placeholder="Share why you're supporting this cause..."
                                    rows="3"
                                />
                            </div>
                        </form>

                        <div className="donation-summary">
                            <h3>💝 Donation Summary</h3>
                            <div className="summary-content">
                                <div className="summary-row">
                                    <span>Campaign:</span>
                                    <span>{campaign.title}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Your Donation:</span>
                                    <span className="donation-amount">
                                        {formData.donationAmount ? formatCurrency(parseFloat(formData.donationAmount)) : 'RM 0.00'}
                                    </span>
                                </div>
                                <div className="summary-row">
                                    <span>Status:</span>
                                    <span>Pending Verification</span>
                                </div>
                            </div>
                        </div>

                        <div className="action-buttons">
                            <button
                                className="back-btn"
                                onClick={goBackToQR}
                                disabled={submitting}
                            >
                                ← Back to QR Code
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleSubmitDonation}
                                disabled={submitting || !receiptImage || !formData.donorName.trim() || !formData.donorPhone.trim() || !formData.donationAmount}
                            >
                                {submitting ? '⏳ Submitting...' : '✅ Submit Donation'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CampaignQRPayment;
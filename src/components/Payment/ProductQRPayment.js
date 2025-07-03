// src/components/Payment/ProductQRPayment.js - Updated to handle accepted offers
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useCart } from '../../context/CartContext';
import './ProductQRPayment.css';

const ProductQRPayment = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const cartContext = useCart();
    const [currentStep, setCurrentStep] = useState('qr');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [receiptImage, setReceiptImage] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [sellerQRCodes, setSellerQRCodes] = useState({});
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        buyerName: '',
        buyerPhone: '',
        buyerEmail: auth.currentUser?.email || '',
        referenceNumber: '',
        notes: ''
    });

    const fileInputRef = useRef(null);
    const user = auth.currentUser;

    // Safe destructuring with fallbacks
    const {
        cart = [],
        acceptedOffers = [],
        clearCart = () => { },
        getTotalPrice = null,
        getCartTotal = null
    } = cartContext || {};

    // Remove the acceptedOffers from location state since we're getting it from context
    // const acceptedOffers = location.state?.acceptedOffers || [];

    // Calculate total price including accepted offers
    const calculateTotalPrice = () => {
        let cartTotal = 0;

        if (getCartTotal && typeof getCartTotal === 'function') {
            cartTotal = getCartTotal();
        } else if (getTotalPrice && typeof getTotalPrice === 'function') {
            cartTotal = getTotalPrice();
        } else {
            // Fallback calculation for regular cart
            cartTotal = cart.reduce((total, item) => {
                const itemPrice = parseFloat(item.price) || 0;
                const itemQuantity = parseInt(item.quantity) || 0;
                return total + (itemPrice * itemQuantity);
            }, 0);
        }

        // Add accepted offers total
        const offersTotal = acceptedOffers.reduce((total, offer) => {
            return total + (offer.offerAmount || 0);
        }, 0);

        return cartTotal + offersTotal;
    };

    // Fetch QR codes from products including accepted offers
    useEffect(() => {
        const fetchSellerQRCodes = async () => {
            console.log('🔍 Fetching QR codes for cart items and accepted offers...');
            setLoading(true);

            const sellerGroups = {};
            const qrCodePromises = [];

            // Process regular cart items
            cart.forEach(item => {
                const sellerId = item.sellerId || item.seller?.id;
                const sellerName = item.sellerName || item.seller?.name || item.seller?.email || 'Unknown Seller';
                const sellerEmail = item.sellerEmail || item.seller?.email;
                const productId = item.productId || item.id;

                if (!sellerId) {
                    console.warn('⚠️ Cart item missing seller information:', item);
                    return;
                }

                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = {
                        sellerId: sellerId,
                        sellerName: sellerName,
                        sellerEmail: sellerEmail,
                        items: [],
                        offers: [],
                        totalAmount: 0,
                        productIds: []
                    };
                }

                sellerGroups[sellerId].items.push(item);
                sellerGroups[sellerId].totalAmount += (item.price * item.quantity);

                if (productId && !sellerGroups[sellerId].productIds.includes(productId)) {
                    sellerGroups[sellerId].productIds.push(productId);
                }
            });

            // Process accepted offers
            acceptedOffers.forEach(offer => {
                const sellerId = offer.sellerId;
                const sellerName = offer.sellerName;
                const sellerEmail = offer.sellerEmail;
                const productId = offer.productId;

                if (!sellerId) {
                    console.warn('⚠️ Accepted offer missing seller information:', offer);
                    return;
                }

                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = {
                        sellerId: sellerId,
                        sellerName: sellerName,
                        sellerEmail: sellerEmail,
                        items: [],
                        offers: [],
                        totalAmount: 0,
                        productIds: []
                    };
                }

                sellerGroups[sellerId].offers.push(offer);
                sellerGroups[sellerId].totalAmount += (offer.offerAmount || 0);

                if (productId && !sellerGroups[sellerId].productIds.includes(productId)) {
                    sellerGroups[sellerId].productIds.push(productId);
                }
            });

            // Fetch QR codes for each seller's products
            for (const [sellerId, group] of Object.entries(sellerGroups)) {
                if (group.productIds.length > 0) {
                    const productId = group.productIds[0];
                    qrCodePromises.push(
                        getDoc(doc(db, 'products', productId))
                            .then(docSnap => {
                                if (docSnap.exists()) {
                                    const productData = docSnap.data();
                                    console.log(`📦 Product ${productId} data:`, productData);

                                    return {
                                        sellerId,
                                        sellerName: group.sellerName,
                                        totalAmount: group.totalAmount,
                                        itemCount: group.items.length,
                                        offerCount: group.offers.length,
                                        qrCodes: productData.qrCodes || [],
                                        meetupPreference: productData.meetupPreference || false
                                    };
                                } else {
                                    console.warn(`⚠️ Product ${productId} not found`);
                                    return {
                                        sellerId,
                                        sellerName: group.sellerName,
                                        totalAmount: group.totalAmount,
                                        itemCount: group.items.length,
                                        offerCount: group.offers.length,
                                        qrCodes: [],
                                        meetupPreference: false
                                    };
                                }
                            })
                            .catch(error => {
                                console.error(`❌ Error fetching product ${productId}:`, error);
                                return {
                                    sellerId,
                                    sellerName: group.sellerName,
                                    totalAmount: group.totalAmount,
                                    itemCount: group.items.length,
                                    offerCount: group.offers.length,
                                    qrCodes: [],
                                    meetupPreference: false
                                };
                            })
                    );
                }
            }

            try {
                const results = await Promise.all(qrCodePromises);
                const qrCodesMap = {};

                results.forEach(result => {
                    if (result.qrCodes && result.qrCodes.length > 0) {
                        const validQR = result.qrCodes.find(qr => qr.imageUrl && qr.bankName);
                        if (validQR) {
                            qrCodesMap[result.sellerId] = {
                                sellerName: result.sellerName,
                                totalAmount: result.totalAmount,
                                itemCount: result.itemCount,
                                offerCount: result.offerCount,
                                qrCode: validQR,
                                meetupPreference: result.meetupPreference
                            };
                        }
                    }
                });

                console.log('💳 Final QR codes map:', qrCodesMap);
                setSellerQRCodes(qrCodesMap);
            } catch (error) {
                console.error('❌ Error fetching QR codes:', error);
            } finally {
                setLoading(false);
            }
        };

        if (cart.length > 0 || acceptedOffers.length > 0) {
            fetchSellerQRCodes();
        } else {
            setLoading(false);
        }
    }, [cart, acceptedOffers]);

    const totalPrice = calculateTotalPrice();

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

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, etc.)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setReceiptImage(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            setReceiptPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const uploadReceiptToCloudinary = async (file) => {
        const CLOUD_NAME = "dh4zcjn4r";
        const UPLOAD_PRESET = "happ2zxv";

        try {
            console.log('📤 Uploading receipt to Cloudinary...');

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

    const handleSubmitPayment = async () => {
        if (!user) {
            alert('Please login to continue');
            return;
        }

        if (!receiptImage) {
            alert('Please upload a payment receipt');
            return;
        }

        if (!formData.buyerName.trim()) {
            alert('Please enter your name');
            return;
        }

        if (!formData.buyerPhone.trim()) {
            alert('Please enter your phone number');
            return;
        }

        try {
            setSubmitting(true);
            console.log('🔄 Starting payment submission process...');

            // Step 1: Upload receipt image
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

            // Step 2: Group items by seller (including offers)
            console.log('🏪 Step 2: Grouping items and offers by seller...');
            const sellerGroups = {};

            // Group regular cart items
            cart.forEach(item => {
                const sellerId = item.sellerId || item.seller?.id;
                const sellerName = item.sellerName || item.seller?.name || item.seller?.email || 'Unknown Seller';
                const sellerEmail = item.sellerEmail || item.seller?.email;

                if (!sellerId) {
                    console.warn('⚠️ Cart item missing seller information:', item);
                    return;
                }

                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = {
                        sellerId: sellerId,
                        sellerName: sellerName,
                        sellerEmail: sellerEmail,
                        items: [],
                        offers: [],
                        totalAmount: 0
                    };
                }
                sellerGroups[sellerId].items.push(item);
                sellerGroups[sellerId].totalAmount += item.price * item.quantity;
            });

            // Group accepted offers
            acceptedOffers.forEach(offer => {
                const sellerId = offer.sellerId;
                const sellerName = offer.sellerName;
                const sellerEmail = offer.sellerEmail;

                if (!sellerId) {
                    console.warn('⚠️ Accepted offer missing seller information:', offer);
                    return;
                }

                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = {
                        sellerId: sellerId,
                        sellerName: sellerName,
                        sellerEmail: sellerEmail,
                        items: [],
                        offers: [],
                        totalAmount: 0
                    };
                }
                sellerGroups[sellerId].offers.push(offer);
                sellerGroups[sellerId].totalAmount += offer.offerAmount;
            });

            console.log('👥 Seller groups created:', Object.keys(sellerGroups).length);

            // Step 3: Create orders for each seller
            console.log('📋 Step 3: Creating orders in Firestore...');
            const orderPromises = [];
            const offerUpdatePromises = [];

            Object.values(sellerGroups).forEach((group, index) => {
                console.log(`📝 Creating order ${index + 1} for seller: ${group.sellerName}`);

                const orderData = {
                    // Buyer information
                    buyerId: user.uid,
                    buyerName: formData.buyerName.trim(),
                    buyerEmail: formData.buyerEmail || user.email,
                    buyerPhone: formData.buyerPhone.trim(),

                    // Seller information
                    sellerId: group.sellerId,
                    sellerName: group.sellerName,
                    sellerEmail: group.sellerEmail,

                    // Order details
                    items: group.items,
                    acceptedOffers: group.offers, // Include accepted offers
                    totalAmount: group.totalAmount,
                    paymentMethod: 'qr',
                    status: 'pending_payment',

                    // Payment information
                    paymentDetails: {
                        method: 'qr_code',
                        referenceNumber: formData.referenceNumber.trim(),
                        receiptImageUrl: receiptImageUrl,
                        notes: formData.notes.trim(),
                        submittedAt: new Date(),
                        hasAcceptedOffers: group.offers.length > 0,
                        regularItemsTotal: group.items.reduce((total, item) => total + (item.price * item.quantity), 0),
                        acceptedOffersTotal: group.offers.reduce((total, offer) => total + offer.offerAmount, 0)
                    },

                    // Timestamps
                    createdAt: new Date(),
                    lastUpdated: new Date(),

                    // Initial message with receipt
                    messages: [
                        {
                            senderId: user.uid,
                            senderName: formData.buyerName.trim(),
                            senderType: 'buyer',
                            message: `💳 Payment completed via QR code\n\n${group.items.length > 0 ? `🛒 Regular Items: ${group.items.length} item(s)\n` : ''}${group.offers.length > 0 ? `💰 Accepted Offers: ${group.offers.length} offer(s)\n` : ''}💵 Total Amount: RM ${group.totalAmount.toFixed(2)}${formData.referenceNumber.trim() ? `\n📄 Reference: ${formData.referenceNumber.trim()}` : ''}${formData.notes.trim() ? `\n💬 Notes: ${formData.notes.trim()}` : ''}\n\n📸 Payment receipt has been uploaded for your review.`,
                            timestamp: new Date(),
                            read: false,
                            attachments: [
                                {
                                    type: 'image',
                                    url: receiptImageUrl,
                                    filename: receiptImage.name,
                                    caption: 'Payment Receipt'
                                }
                            ]
                        }
                    ]
                };

                console.log(`📋 Order data for ${group.sellerName}:`, orderData);
                orderPromises.push(addDoc(collection(db, 'orders'), orderData));

                // Update accepted offers status
                group.offers.forEach(offer => {
                    offerUpdatePromises.push(
                        updateDoc(doc(db, 'orders', offer.id), {
                            status: 'payment_submitted',
                            paymentSubmittedAt: new Date(),
                            receiptImageUrl: receiptImageUrl
                        })
                    );
                });
            });

            // Step 4: Save all orders and update offers
            console.log('💾 Step 4: Saving orders and updating offers...');
            await Promise.all([...orderPromises, ...offerUpdatePromises]);
            console.log('✅ All orders and offers updated successfully');

            // Step 5: Clear cart and navigate
            console.log('🧹 Step 5: Clearing cart and redirecting...');
            if (clearCart && typeof clearCart === 'function') {
                clearCart();
            }

            alert('🎉 Payment submitted successfully! Your receipt has been sent to the seller(s) for verification.');
            navigate('/orders');

        } catch (error) {
            console.error('❌ Payment submission error:', error);

            if (error.code === 'permission-denied') {
                alert('Permission denied. Please check your login status and try again.');
            } else if (error.code === 'unavailable') {
                alert('Service temporarily unavailable. Please try again in a moment.');
            } else {
                alert(`Failed to process payment: ${error.message}`);
            }
        } finally {
            setSubmitting(false);
            console.log('🔄 Payment submission process completed');
        }
    };

    const proceedToReceipt = () => {
        setCurrentStep('receipt');
    };

    const goBackToQR = () => {
        setCurrentStep('qr');
    };

    const isCartEmpty = cart.length === 0 && acceptedOffers.length === 0;

    if (isCartEmpty) {
        return (
            <div className="qr-payment-container">
                <div className="qr-payment-card">
                    <h2>🛒 Nothing to Pay</h2>
                    <p>Your cart is empty and you have no accepted offers to pay for.</p>
                    <button
                        className="back-btn"
                        onClick={() => navigate('/marketplace')}
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="qr-payment-container">
                <div className="qr-payment-card">
                    <div className="loading-state">
                        <h2>🔄 Loading Payment Options...</h2>
                        <p>Fetching seller payment information...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="qr-payment-container">
            <div className="qr-payment-card">
                {currentStep === 'qr' ? (
                    <>
                        <div className="qr-header">
                            <h2>💳 QR Code Payment</h2>
                            <p>Scan the QR code(s) below to make payment to seller(s)</p>
                            {acceptedOffers.length > 0 && (
                                <div className="offers-notice">
                                    <p>✅ <strong>{acceptedOffers.length}</strong> accepted offer(s) included at agreed prices</p>
                                </div>
                            )}
                        </div>

                        <div className="qr-codes-section">
                            {Object.keys(sellerQRCodes).length > 0 ? (
                                Object.entries(sellerQRCodes).map(([sellerId, qrData]) => (
                                    <div key={sellerId} className="seller-qr-section">
                                        <div className="seller-info">
                                            <h3>🏪 {qrData.sellerName}</h3>
                                            <div className="seller-breakdown">
                                                <p className="seller-amount">
                                                    <strong>Total: RM {qrData.totalAmount.toFixed(2)}</strong>
                                                </p>
                                                {qrData.itemCount > 0 && (
                                                    <p className="item-breakdown">
                                                        🛒 {qrData.itemCount} regular item(s)
                                                    </p>
                                                )}
                                                {qrData.offerCount > 0 && (
                                                    <p className="offer-breakdown">
                                                        💰 {qrData.offerCount} accepted offer(s)
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="qr-display">
                                            <div className="real-qr-code">
                                                <img
                                                    src={qrData.qrCode.imageUrl}
                                                    alt={`QR Code for ${qrData.sellerName}`}
                                                    className="qr-image"
                                                    onError={(e) => {
                                                        console.error('❌ Failed to load QR code:', qrData.qrCode.imageUrl);
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <div className="qr-fallback" style={{ display: 'none' }}>
                                                    <div className="qr-error">
                                                        <span>❌ QR Code not available</span>
                                                        <p>Please contact seller for payment details</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="qr-details">
                                                <div className="bank-info">
                                                    <h4>{qrData.qrCode.bankName}</h4>
                                                    <p><strong>Account Holder:</strong> {qrData.qrCode.accountHolder}</p>
                                                    {qrData.qrCode.accountNumber && (
                                                        <p><strong>Account Number:</strong> {qrData.qrCode.accountNumber}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-qr-codes">
                                    <span className="warning-icon">⚠️</span>
                                    <h3>No QR Codes Available</h3>
                                    <p>The sellers haven't provided QR codes for payment.</p>
                                    <p>Please contact the sellers directly for payment instructions or choose the meetup option.</p>
                                </div>
                            )}
                        </div>

                        <div className="payment-summary">
                            <div className="summary-breakdown">
                                {cart.length > 0 && (
                                    <div className="summary-row">
                                        <span>Regular Items ({cart.length}):</span>
                                        <span>RM {cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {acceptedOffers.length > 0 && (
                                    <div className="summary-row offer-summary">
                                        <span>Accepted Offers ({acceptedOffers.length}):</span>
                                        <span>RM {acceptedOffers.reduce((total, offer) => total + offer.offerAmount, 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <hr className="summary-divider" />
                            </div>
                            <div className="summary-row total-row">
                                <span><strong>Total Amount:</strong></span>
                                <span className="total-amount"><strong>RM {totalPrice.toFixed(2)}</strong></span>
                            </div>
                            <div className="summary-row">
                                <span>Number of Sellers:</span>
                                <span>{Object.keys(sellerQRCodes).length}</span>
                            </div>
                        </div>

                        <div className="payment-instructions">
                            <h3>📱 How to Pay:</h3>
                            <ol>
                                <li>Open your banking app (Maybank2u, CIMB Clicks, Touch 'n Go eWallet, etc.)</li>
                                <li>Scan each QR code above</li>
                                <li>Pay the exact amount shown for each seller</li>
                                {acceptedOffers.length > 0 && (
                                    <li className="offer-instruction">
                                        <strong>💰 For accepted offers: Pay only the agreed offer amount (not original price)</strong>
                                    </li>
                                )}
                                <li>Take screenshots of all payment receipts</li>
                                <li>Click "I Have Paid" below</li>
                            </ol>
                        </div>

                        <div className="action-buttons">
                            <button
                                className="back-btn"
                                onClick={() => navigate('/checkout')}
                            >
                                ← Back to Checkout
                            </button>
                            <button
                                className="paid-btn"
                                onClick={proceedToReceipt}
                                disabled={Object.keys(sellerQRCodes).length === 0}
                            >
                                💳 I Have Paid
                            </button>
                        </div>
                    </>
                ) : (
                    // Receipt Upload Step
                    <>
                        <div className="receipt-header">
                            <h2>📸 Upload Payment Receipt</h2>
                            <p>Please upload your payment receipt and fill in your details</p>
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
                                        <p>Click here to select your payment receipt image</p>
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

                        <form className="payment-form" onSubmit={(e) => e.preventDefault()}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        name="buyerName"
                                        value={formData.buyerName}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="buyerPhone"
                                        value={formData.buyerPhone}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 012-345-6789"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="buyerEmail"
                                    value={formData.buyerEmail}
                                    onChange={handleInputChange}
                                    placeholder="your.email@example.com"
                                    readOnly
                                />
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
                                <label>Additional Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Any additional information about your payment..."
                                    rows="3"
                                />
                            </div>
                        </form>

                        <div className="order-summary">
                            <h3>📦 Order Summary</h3>
                            <div className="summary-content">
                                {cart.length > 0 && (
                                    <div className="summary-row">
                                        <span>Regular Items ({cart.length}):</span>
                                        <span>RM {cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {acceptedOffers.length > 0 && (
                                    <div className="summary-row offer-summary">
                                        <span>Accepted Offers ({acceptedOffers.length}):</span>
                                        <span>RM {acceptedOffers.reduce((total, offer) => total + offer.offerAmount, 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <hr className="summary-divider" />
                                <div className="summary-row total-row">
                                    <span><strong>Total Amount:</strong></span>
                                    <span className="total-amount"><strong>RM {totalPrice.toFixed(2)}</strong></span>
                                </div>
                                <div className="summary-row">
                                    <span>Payment Method:</span>
                                    <span>QR Code</span>
                                </div>
                                <div className="summary-row">
                                    <span>Total Items:</span>
                                    <span>{cart.reduce((total, item) => total + item.quantity, 0) + acceptedOffers.length} item(s)</span>
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
                                onClick={handleSubmitPayment}
                                disabled={submitting || !receiptImage || !formData.buyerName.trim() || !formData.buyerPhone.trim()}
                            >
                                {submitting ? '⏳ Submitting...' : '✅ Submit Payment'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductQRPayment;
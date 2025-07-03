// src/components/Payment/ProductPaymentConfirmation.js
import React, { useState } from 'react';
import { auth } from '../../firebase';
import './ProductPaymentConfirmation.css';

const ProductPaymentConfirmation = ({
    sellerGroup,
    selectedBank,
    onConfirm,
    onBack,
    onCancel,
    loading
}) => {
    const [formData, setFormData] = useState({
        buyerName: auth.currentUser?.displayName || '',
        buyerEmail: auth.currentUser?.email || '',
        referenceNumber: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});

    // Add safety checks
    if (!sellerGroup || !selectedBank) {
        return (
            <div className="product-payment-confirmation">
                <div className="error-message">
                    Missing payment information. Please go back and try again.
                </div>
                <button onClick={onBack} className="back-button">
                    Back
                </button>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.buyerName.trim()) {
            newErrors.buyerName = 'Name is required';
        }

        if (!formData.buyerEmail.trim()) {
            newErrors.buyerEmail = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.buyerEmail)) {
            newErrors.buyerEmail = 'Invalid email format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onConfirm(formData);
        }
    };

    return (
        <div className="product-payment-confirmation">
            <div className="confirmation-header">
                <h2>Confirm Your Purchase</h2>
                <button onClick={onCancel} className="close-btn">×</button>
            </div>

            <div className="confirmation-content">
                <div className="purchase-summary">
                    <h3>Purchase Summary</h3>
                    <div className="summary-card">
                        <div className="seller-section">
                            <div className="summary-row">
                                <span>Seller:</span>
                                <strong>{sellerGroup.seller.name || sellerGroup.seller.email}</strong>
                            </div>
                        </div>

                        <div className="items-section">
                            <h4>Items:</h4>
                            {sellerGroup.items.map(item => (
                                <div key={item.id} className="item-summary">
                                    <div className="item-info">
                                        <span>{item.name}</span>
                                        <span>{formatCurrency(item.price)} × {item.quantity}</span>
                                    </div>
                                    <strong>{formatCurrency(item.price * item.quantity)}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="payment-section">
                            <div className="summary-row">
                                <span>Total Amount:</span>
                                <strong className="total-amount">{formatCurrency(sellerGroup.total)}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Payment Method:</span>
                                <strong>QR Payment</strong>
                            </div>
                            <div className="summary-row">
                                <span>Bank:</span>
                                <strong>{selectedBank.bankName}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Account Holder:</span>
                                <strong>{selectedBank.accountHolder}</strong>
                            </div>
                            {selectedBank.accountNumber && (
                                <div className="summary-row">
                                    <span>Account Number:</span>
                                    <strong>{selectedBank.accountNumber}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="confirmation-form">
                    <h3>Buyer Information</h3>

                    <div className="form-group">
                        <label htmlFor="buyerName">Full Name *</label>
                        <input
                            type="text"
                            id="buyerName"
                            name="buyerName"
                            value={formData.buyerName}
                            onChange={handleInputChange}
                            className={errors.buyerName ? 'error' : ''}
                            placeholder="Enter your full name"
                            disabled={loading}
                        />
                        {errors.buyerName && <span className="error-message">{errors.buyerName}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="buyerEmail">Email Address *</label>
                        <input
                            type="email"
                            id="buyerEmail"
                            name="buyerEmail"
                            value={formData.buyerEmail}
                            onChange={handleInputChange}
                            className={errors.buyerEmail ? 'error' : ''}
                            placeholder="Enter your email address"
                            disabled={loading}
                        />
                        {errors.buyerEmail && <span className="error-message">{errors.buyerEmail}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="referenceNumber">Transaction Reference Number (Optional)</label>
                        <input
                            type="text"
                            id="referenceNumber"
                            name="referenceNumber"
                            value={formData.referenceNumber}
                            onChange={handleInputChange}
                            placeholder="e.g., TXN123456789"
                            disabled={loading}
                        />
                        <small className="help-text">
                            Reference number from your banking app (helps seller verify payment)
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Notes to Seller (Optional)</label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="Any special instructions or notes for the seller..."
                            rows="3"
                            disabled={loading}
                        />
                    </div>

                    <div className="confirmation-note">
                        <div className="note-content">
                            <strong>Important:</strong> Your order will be marked as "pending payment" until the seller verifies your payment. The seller will be notified and may contact you to arrange delivery or pickup.
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={onBack}
                            className="back-button"
                            disabled={loading}
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className="confirm-button"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Confirm Purchase'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductPaymentConfirmation;
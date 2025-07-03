import React, { useState } from 'react';
import { auth } from '../../firebase';
import './PaymentConfirmation.css';

const PaymentConfirmation = ({
    donationAmount,
    selectedBank,
    campaign,
    onConfirm,
    onBack,
    onClose,
    loading
}) => {
    const [formData, setFormData] = useState({
        donorName: auth.currentUser?.displayName || '',
        donorEmail: auth.currentUser?.email || '',
        referenceNumber: '',
        message: '',
        donorId: auth.currentUser?.uid || null
    });

    const [errors, setErrors] = useState({});

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

        if (!formData.donorName.trim()) {
            newErrors.donorName = 'Name is required';
        }

        if (!formData.donorEmail.trim()) {
            newErrors.donorEmail = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.donorEmail)) {
            newErrors.donorEmail = 'Invalid email format';
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
        <div className="qr-payment-modal">
            <div className="qr-payment-content">
                <div className="qr-payment-header">
                    <h2>Confirm Your Donation</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="qr-payment-body">
                    <div className="confirmation-summary">
                        <h3>Payment Summary</h3>
                        <div className="summary-card">
                            <div className="summary-row">
                                <span>Campaign:</span>
                                <strong>{campaign.title}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Amount:</span>
                                <strong>₹{donationAmount}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Bank:</span>
                                <strong>{selectedBank.bankName}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Account Holder:</span>
                                <strong>{selectedBank.accountHolder}</strong>
                            </div>
                            {selectedBank.upiId && (
                                <div className="summary-row">
                                    <span>UPI ID:</span>
                                    <strong>{selectedBank.upiId}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="confirmation-form">
                        <h3>Donor Information</h3>

                        <div className="form-group">
                            <label htmlFor="donorName">Full Name *</label>
                            <input
                                type="text"
                                id="donorName"
                                name="donorName"
                                value={formData.donorName}
                                onChange={handleInputChange}
                                className={errors.donorName ? 'error' : ''}
                                placeholder="Enter your full name"
                                disabled={loading}
                            />
                            {errors.donorName && <span className="error-message">{errors.donorName}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="donorEmail">Email Address *</label>
                            <input
                                type="email"
                                id="donorEmail"
                                name="donorEmail"
                                value={formData.donorEmail}
                                onChange={handleInputChange}
                                className={errors.donorEmail ? 'error' : ''}
                                placeholder="Enter your email address"
                                disabled={loading}
                            />
                            {errors.donorEmail && <span className="error-message">{errors.donorEmail}</span>}
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
                            <small className="form-help">
                                Reference number from your payment app (helps in verification)
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">Message (Optional)</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                placeholder="Leave a message of support..."
                                rows="3"
                                disabled={loading}
                            />
                        </div>

                        <div className="confirmation-note">
                            <div className="note-icon">ℹ️</div>
                            <div className="note-content">
                                <strong>Important:</strong> Your donation will be marked as "pending" until verified by the campaign organizer. You may receive a confirmation email once verified.
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={onBack}
                                className="btn btn-secondary"
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="btn btn-success"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Confirm Donation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PaymentConfirmation;
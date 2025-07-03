// src/components/Payment/QRPayment.js - Fixed Layout Structure
import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import PaymentConfirmation from './PaymentConfirmation';
import './QRPayment.css';

const QRPayment = ({ campaign, onClose, onPaymentSuccess }) => {
    const [selectedQR, setSelectedQR] = useState(0);
    const [donationAmount, setDonationAmount] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [loading, setLoading] = useState(false);

    const predefinedAmounts = [50, 100, 200, 500, 1000];

    const handleAmountSelect = (amount) => {
        setDonationAmount(amount.toString());
    };

    const handleCustomAmount = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setDonationAmount(value);
        }
    };

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handlePaymentConfirmation = async (paymentData) => {
        setLoading(true);
        try {
            const donationData = {
                amount: parseInt(donationAmount),
                donorName: paymentData.donorName,
                donorEmail: paymentData.donorEmail,
                paymentMethod: 'qr_scan',
                bankDetails: campaign.qrCodes[selectedQR],
                referenceNumber: paymentData.referenceNumber || '',
                message: paymentData.message || '',
                status: 'pending',
                timestamp: new Date(),
                donorId: auth.currentUser?.uid || null
            };

            // Add donation to campaign and update totals
            const campaignRef = doc(db, 'campaigns', campaign.id);
            await updateDoc(campaignRef, {
                donations: arrayUnion(donationData),
                currentAmount: increment(parseInt(donationAmount)),
                donationCount: increment(1),
                lastDonation: new Date()
            });

            setLoading(false);
            onPaymentSuccess && onPaymentSuccess({
                ...donationData,
                amount: parseInt(donationAmount)
            });
            onClose();

            alert('Thank you for your donation! Your payment is being verified and will appear once confirmed.');
        } catch (error) {
            console.error('Error processing donation:', error);
            alert('Error processing donation. Please try again.');
            setLoading(false);
        }
    };

    const validQRCodes = campaign.qrCodes?.filter(qr => qr.imageUrl && qr.bankName) || [];

    if (validQRCodes.length === 0) {
        return (
            <div className="qr-payment-modal">
                <div className="qr-payment-content">
                    <div className="qr-payment-header">
                        <h2>Payment Not Available</h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>
                    <div className="qr-payment-body">
                        <p>Sorry, no payment methods are currently available for this campaign.</p>
                        <button className="cancel-button" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    if (showConfirmation) {
        return (
            <PaymentConfirmation
                donationAmount={donationAmount}
                selectedBank={validQRCodes[selectedQR]}
                campaign={campaign}
                onConfirm={handlePaymentConfirmation}
                onBack={() => setShowConfirmation(false)}
                onClose={onClose}
                loading={loading}
            />
        );
    }

    return (
        <div className="qr-payment-modal">
            <div className="qr-payment-content">
                <div className="qr-payment-header">
                    <h2>Donate to {campaign.title}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="qr-payment-body">
                    {/* ✅ Amount Selection */}
                    <div className="amount-selection">
                        <h3>Select Donation Amount</h3>
                        <div className="predefined-amounts">
                            {predefinedAmounts.map((amount) => (
                                <button
                                    key={amount}
                                    className={`amount-btn ${donationAmount === amount.toString() ? 'selected' : ''}`}
                                    onClick={() => handleAmountSelect(amount)}
                                >
                                    {formatCurrency(amount)}
                                </button>
                            ))}
                        </div>
                        <div className="custom-amount">
                            <label>Or enter custom amount:</label>
                            <div className="amount-input-container">
                                <span className="currency">RM</span>
                                <input
                                    type="text"
                                    value={donationAmount}
                                    onChange={handleCustomAmount}
                                    placeholder="Enter amount"
                                    className="amount-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ✅ Payment Method Selection */}
                    {validQRCodes.length > 1 && (
                        <div className="payment-method-selection">
                            <h3>Select Payment Method</h3>
                            <div className="payment-methods">
                                {validQRCodes.map((qrCode, index) => (
                                    <button
                                        key={index}
                                        className={`payment-method-btn ${selectedQR === index ? 'selected' : ''}`}
                                        onClick={() => setSelectedQR(index)}
                                    >
                                        <div className="bank-info">
                                            <strong>{qrCode.bankName}</strong>
                                            <p>{qrCode.accountHolder}</p>
                                            {qrCode.accountNumber && <p className="account-number">{qrCode.accountNumber}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ✅ QR Code Display - RESTRUCTURED */}
                    {donationAmount && (
                        <div className="qr-display">
                            {/* ✅ MOVED: Title above QR code */}
                            <h3>Scan QR Code to Pay</h3>

                            {/* ✅ QR Code and Bank Details */}
                            <div className="qr-code-container">
                                <img
                                    src={validQRCodes[selectedQR].imageUrl}
                                    alt="Payment QR Code"
                                    className="qr-code-image"
                                />
                                <div className="qr-details">
                                    <div className="bank-details">
                                        <h4>{validQRCodes[selectedQR].bankName}</h4>
                                        <p><strong>Account Holder:</strong> {validQRCodes[selectedQR].accountHolder}</p>
                                        {validQRCodes[selectedQR].accountNumber && (
                                            <p><strong>Account Number:</strong> {validQRCodes[selectedQR].accountNumber}</p>
                                        )}
                                        <p className="amount-display">
                                            <strong>Amount: {formatCurrency(parseInt(donationAmount))}</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ✅ SEPARATED: Payment Instructions */}
                    {donationAmount && (
                        <div className="payment-instructions">
                            <h4>How to pay:</h4>
                            <ol>
                                <li>Open your banking app (Maybank2u, CIMB Clicks, Touch 'n Go eWallet, etc.)</li>
                                <li>Scan the QR code above</li>
                                <li>Enter the amount: {formatCurrency(parseInt(donationAmount))}</li>
                                <li>Complete the payment</li>
                                <li>Click "I have paid" below</li>
                            </ol>
                        </div>
                    )}

                    {/* ✅ SEPARATED: Payment Actions at Bottom */}
                    {donationAmount && (
                        <div className="payment-actions">
                            <button
                                className="submit-button"
                                onClick={() => setShowConfirmation(true)}
                                disabled={!donationAmount || parseInt(donationAmount) <= 0}
                            >
                                I have paid {formatCurrency(parseInt(donationAmount))}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRPayment;
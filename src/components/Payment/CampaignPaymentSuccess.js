// src/components/Payment/CampaignPaymentSuccess.js - Success modal for campaign donations
import React from 'react';
import { Link } from 'react-router-dom';
import '../Payment/CampaignPaymentSuccess.css';

const CampaignPaymentSuccess = ({ paymentData, campaignTitle, campaignId, onClose }) => {
    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="campaign-payment-success-overlay">
            <div className="campaign-payment-success-modal">
                <div className="success-header">
                    <div className="success-icon">🎉</div>
                    <h2>Donation Submitted Successfully!</h2>
                    <p>Thank you for supporting this campaign</p>
                </div>

                <div className="success-content">
                    <div className="donation-details">
                        <h3>📋 Donation Details</h3>
                        <div className="detail-row">
                            <span>Campaign:</span>
                            <span>{campaignTitle}</span>
                        </div>
                        <div className="detail-row">
                            <span>Your Name:</span>
                            <span>{paymentData.donorName}</span>
                        </div>
                        <div className="detail-row">
                            <span>Donation Amount:</span>
                            <span className="amount">{formatCurrency(paymentData.amount)}</span>
                        </div>
                        {paymentData.referenceNumber && (
                            <div className="detail-row">
                                <span>Reference Number:</span>
                                <span>{paymentData.referenceNumber}</span>
                            </div>
                        )}
                        {paymentData.message && (
                            <div className="detail-row">
                                <span>Your Message:</span>
                                <span className="message">"{paymentData.message}"</span>
                            </div>
                        )}
                        <div className="detail-row">
                            <span>Status:</span>
                            <span className="status pending">⏳ Pending Verification</span>
                        </div>
                    </div>

                    <div className="what-happens-next">
                        <h3>✨ What Happens Next?</h3>
                        <div className="steps">
                            <div className="step">
                                <span className="step-number">1</span>
                                <div className="step-content">
                                    <h4>📧 Campaign Creator Notified</h4>
                                    <p>The campaign creator has received a message with your donation details and payment receipt.</p>
                                </div>
                            </div>
                            <div className="step">
                                <span className="step-number">2</span>
                                <div className="step-content">
                                    <h4>🔍 Payment Verification</h4>
                                    <p>The campaign creator will verify your payment receipt and confirm your donation.</p>
                                </div>
                            </div>
                            <div className="step">
                                <span className="step-number">3</span>
                                <div className="step-content">
                                    <h4>✅ Donation Confirmed</h4>
                                    <p>Once verified, your donation will be added to the campaign's total and you'll receive a confirmation.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="important-note">
                        <div className="note-icon">💡</div>
                        <div className="note-content">
                            <h4>Important Note</h4>
                            <p>Your donation is currently <strong>pending verification</strong>. The campaign creator will review your payment receipt and confirm your donation within 24-48 hours.</p>
                        </div>
                    </div>

                    <div className="receipt-info">
                        <div className="receipt-icon">📸</div>
                        <div className="receipt-content">
                            <h4>Receipt Submitted</h4>
                            <p>Your payment receipt has been securely uploaded and sent to the campaign creator for verification.</p>
                        </div>
                    </div>
                </div>

                <div className="success-actions">
                    <button className="primary-btn" onClick={onClose}>
                        ✅ Got It
                    </button>
                    <Link to="/fundraising" className="secondary-btn">
                        🔍 Browse More Campaigns
                    </Link>
                    <Link to={`/campaign/${campaignId}`} className="tertiary-btn">
                        📄 View Campaign
                    </Link>
                </div>

                <div className="thank-you-message">
                    <h3>🙏 Thank You for Your Generosity!</h3>
                    <p>Your support makes a real difference. Together, we can achieve great things!</p>
                </div>
            </div>
        </div>
    );
};

export default CampaignPaymentSuccess;
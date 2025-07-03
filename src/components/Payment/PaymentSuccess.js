// src/components/Payment/PaymentSuccess.js
import React from 'react';
import { Link } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentSuccess = ({
    paymentData,
    campaignTitle,
    campaignId,
    onClose
}) => {
    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="payment-success-overlay">
            <div className="payment-success-modal">
                <div className="success-animation">
                    <div className="success-checkmark">
                        <div className="check-icon">
                            <span className="icon-line line-tip"></span>
                            <span className="icon-line line-long"></span>
                            <div className="icon-circle"></div>
                            <div className="icon-fix"></div>
                        </div>
                    </div>
                </div>

                <div className="success-content">
                    <h2>Thank You for Your Donation! 🎉</h2>
                    <p className="success-message">
                        Your generous contribution makes a real difference
                    </p>

                    <div className="donation-details">
                        <div className="detail-row">
                            <span className="detail-label">Amount Donated:</span>
                            <span className="detail-value amount">
                                {formatCurrency(paymentData.amount)}
                            </span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Campaign:</span>
                            <span className="detail-value">{campaignTitle}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Donor Name:</span>
                            <span className="detail-value">{paymentData.donorName}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Transaction ID:</span>
                            <span className="detail-value transaction-id">
                                {paymentData.paymentIntentId}
                            </span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Date & Time:</span>
                            <span className="detail-value">
                                {formatDate(new Date())}
                            </span>
                        </div>

                        {paymentData.message && (
                            <div className="detail-row message-row">
                                <span className="detail-label">Your Message:</span>
                                <span className="detail-value message">
                                    "{paymentData.message}"
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="success-actions">
                        <Link
                            to={`/campaign/${campaignId}`}
                            className="view-campaign-btn"
                        >
                            View Campaign
                        </Link>
                        <Link
                            to="/fundraising"
                            className="browse-campaigns-btn"
                        >
                            Browse More Campaigns
                        </Link>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="close-modal-btn"
                            >
                                Close
                            </button>
                        )}
                    </div>

                    <div className="receipt-info">
                        <div className="receipt-note">
                            <h4>Receipt & Tax Information</h4>
                            <p>
                                A receipt has been sent to <strong>{paymentData.donorEmail}</strong>.
                                Please keep this for your records.
                            </p>
                            <p className="tax-note">
                                This donation may be tax-deductible. Please consult with your tax advisor.
                            </p>
                        </div>
                    </div>

                    <div className="social-share">
                        <h4>Share Your Good Deed</h4>
                        <p>Inspire others to make a difference too!</p>
                        <div className="share-buttons">
                            <button
                                onClick={() => {
                                    const text = `I just donated ${formatCurrency(paymentData.amount)} to "${campaignTitle}" on UTMCF Marketplace! Join me in making a difference. 💝`;
                                    const url = `${window.location.origin}/campaign/${campaignId}`;
                                    if (navigator.share) {
                                        navigator.share({ title: 'My Donation', text, url });
                                    } else {
                                        navigator.clipboard.writeText(`${text} ${url}`);
                                        alert('Link copied to clipboard!');
                                    }
                                }}
                                className="share-btn"
                            >
                                📱 Share
                            </button>

                            <a
                                href={`https://twitter.com/intent/tweet?text=I just donated ${formatCurrency(paymentData.amount)} to help with "${campaignTitle}"! Join me in making a difference 💝&url=${window.location.origin}/campaign/${campaignId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-btn twitter"
                            >
                                🐦 Twitter
                            </a>

                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${window.location.origin}/campaign/${campaignId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-btn facebook"
                            >
                                📘 Facebook
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
// src/components/Payment/DonationVerification.js - Component for verifying donations
import React, { useState } from 'react';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import './DonationVerification.css';

const DonationVerification = ({ order, onVerificationComplete }) => {
    const [verifying, setVerifying] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleVerifyDonation = async () => {
        try {
            setVerifying(true);
            console.log('✅ Verifying donation for order:', order.id);

            const donationAmount = order.donationAmount || order.totalAmount;

            // Step 1: Update the order status
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, {
                status: 'confirmed',
                verifiedAt: new Date(),
                lastUpdated: new Date(),
                messages: arrayUnion({
                    senderId: 'system',
                    senderName: 'System',
                    senderType: 'system',
                    message: `✅ Donation verified and confirmed!\n\n💰 Amount: ${formatCurrency(donationAmount)}\n🎉 This donation has been added to your campaign total.\n\nThank you for your generous support!`,
                    timestamp: new Date(),
                    read: false
                })
            });

            // Step 2: Update the campaign - add to current amount
            const campaignRef = doc(db, 'campaigns', order.campaignId);
            await updateDoc(campaignRef, {
                currentAmount: increment(donationAmount),
                lastUpdated: new Date()
            });

            // Step 3: Update campaign donations array
            // Note: This is more complex as we need to find and update the specific donation
            // For now, we'll let the campaign totals be the source of truth

            console.log('✅ Donation verified successfully');
            alert('Donation verified successfully! The amount has been added to your campaign.');

            if (onVerificationComplete) {
                onVerificationComplete('verified');
            }

        } catch (error) {
            console.error('❌ Error verifying donation:', error);
            alert('Failed to verify donation. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleRejectDonation = async () => {
        if (!window.confirm('Are you sure you want to reject this donation? This action cannot be undone.')) {
            return;
        }

        try {
            setRejecting(true);
            console.log('❌ Rejecting donation for order:', order.id);

            // Update the order status
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, {
                status: 'rejected',
                rejectedAt: new Date(),
                lastUpdated: new Date(),
                messages: arrayUnion({
                    senderId: 'system',
                    senderName: 'System',
                    senderType: 'system',
                    message: `❌ Donation could not be verified.\n\nThe payment receipt could not be verified. Please contact the campaign creator directly if you believe this is an error.\n\nReason: Payment verification failed`,
                    timestamp: new Date(),
                    read: false
                })
            });

            console.log('❌ Donation rejected');
            alert('Donation has been rejected. The donor will be notified.');

            if (onVerificationComplete) {
                onVerificationComplete('rejected');
            }

        } catch (error) {
            console.error('❌ Error rejecting donation:', error);
            alert('Failed to reject donation. Please try again.');
        } finally {
            setRejecting(false);
        }
    };

    // Don't show verification buttons if already processed
    if (order.status === 'confirmed' || order.status === 'rejected') {
        return (
            <div className="donation-verification-container">
                <div className={`verification-status ${order.status}`}>
                    {order.status === 'confirmed' ? (
                        <>
                            <span className="status-icon">✅</span>
                            <span>Donation Verified & Confirmed</span>
                        </>
                    ) : (
                        <>
                            <span className="status-icon">❌</span>
                            <span>Donation Rejected</span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="donation-verification-container">
            <div className="verification-header">
                <h4>💳 Donation Verification Required</h4>
                <p>Please verify this donation by checking the payment receipt</p>
            </div>

            <div className="donation-details">
                <div className="detail-row">
                    <span>Donor:</span>
                    <span>{order.buyerName}</span>
                </div>
                <div className="detail-row">
                    <span>Amount:</span>
                    <span className="amount">{formatCurrency(order.donationAmount || order.totalAmount)}</span>
                </div>
                <div className="detail-row">
                    <span>Campaign:</span>
                    <span>{order.campaignTitle}</span>
                </div>
                {order.paymentDetails?.referenceNumber && (
                    <div className="detail-row">
                        <span>Reference:</span>
                        <span>{order.paymentDetails.referenceNumber}</span>
                    </div>
                )}
                <div className="detail-row">
                    <span>Status:</span>
                    <span className="status pending">⏳ Pending Verification</span>
                </div>
            </div>

            <div className="verification-actions">
                <button
                    className="verify-btn"
                    onClick={handleVerifyDonation}
                    disabled={verifying || rejecting}
                >
                    {verifying ? '⏳ Verifying...' : '✅ Verify & Confirm'}
                </button>
                <button
                    className="reject-btn"
                    onClick={handleRejectDonation}
                    disabled={verifying || rejecting}
                >
                    {rejecting ? '⏳ Rejecting...' : '❌ Reject'}
                </button>
            </div>

            <div className="verification-note">
                <p><strong>Note:</strong> Verifying this donation will add the amount to your campaign total. Only verify if you have confirmed the payment in your bank account.</p>
            </div>
        </div>
    );
};

export default DonationVerification;
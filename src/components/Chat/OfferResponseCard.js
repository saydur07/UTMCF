// src/components/Chat/OfferResponseCard.js - Updated with Payment Integration
import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './OfferResponseCard.css';

function OfferResponseCard({ order, onUpdate }) {
    const [processing, setProcessing] = useState(null);
    const [showCounterInput, setShowCounterInput] = useState(false);
    const [counterAmount, setCounterAmount] = useState('');
    const user = auth.currentUser;

    // Debug logging
    console.log('🔍 OfferResponseCard received order:', {
        orderId: order?.id,
        type: order?.type,
        status: order?.status,
        sellerId: order?.sellerId,
        currentUserId: user?.uid,
        hasOfferAmount: !!order?.offerAmount,
        hasOriginalPrice: !!order?.originalPrice
    });

    // Check if user is the seller and offer is still pending
    const isSeller = user && user.uid === order?.sellerId;
    const isPending = order?.status === 'offer_pending';
    const isOfferType = order?.type === 'offer';
    const canRespond = isSeller && isPending && isOfferType;

    console.log('🎯 OfferResponseCard conditions:', {
        isSeller,
        isPending,
        isOfferType,
        canRespond
    });

    // If this isn't an offer that the seller can respond to, don't render
    if (!canRespond) {
        console.log('❌ OfferResponseCard: Cannot respond to this offer');
        return null;
    }

    // Ensure we have required data
    if (!order.offerAmount || !order.originalPrice || !order.productName) {
        console.log('❌ OfferResponseCard: Missing required offer data');
        return null;
    }

    const handleOfferResponse = async (action, counterValue = null) => {
        if (!user || processing) return;

        setProcessing(action);

        try {
            let newStatus, responseMessage;

            if (action === 'accept') {
                newStatus = 'offer_accepted';
                responseMessage = `✅ OFFER ACCEPTED!\n\n🎉 Great news! I accept your offer of RM ${order.offerAmount.toFixed(2)} for "${order.productName}".\n\n💰 Final Price: RM ${order.offerAmount.toFixed(2)}\n💾 You Save: RM ${(order.originalPrice - order.offerAmount).toFixed(2)}\n\n🛒 The item has been automatically added to your cart with the agreed price.\n💳 Please proceed to checkout to complete your purchase.`;
            } else if (action === 'reject') {
                newStatus = 'offer_rejected';
                responseMessage = `❌ OFFER DECLINED\n\nThank you for your interest in "${order.productName}". Unfortunately, I cannot accept your offer of RM ${order.offerAmount.toFixed(2)}.\n\n💭 You're welcome to make another offer or purchase at the listed price of RM ${order.originalPrice.toFixed(2)}.`;
            } else if (action === 'counter') {
                newStatus = 'offer_countered';
                const counterPrice = parseFloat(counterValue);
                responseMessage = `🔄 COUNTER OFFER\n\nThank you for your offer of RM ${order.offerAmount.toFixed(2)} for "${order.productName}".\n\n💡 I'd like to counter with: RM ${counterPrice.toFixed(2)}\n📊 Original Price: RM ${order.originalPrice.toFixed(2)}\n🤝 My Counter: RM ${counterPrice.toFixed(2)}\n💾 You'd Save: RM ${(order.originalPrice - counterPrice).toFixed(2)}\n\nWhat do you think?`;
            }

            // Create response message
            const responseMsg = {
                senderId: user.uid,
                senderName: user.displayName || user.email,
                senderType: 'seller',
                message: responseMessage,
                timestamp: new Date(),
                read: false,
                messageType: 'offer_response',
                offerResponse: {
                    action,
                    originalOffer: order.offerAmount,
                    ...(counterValue && { counterAmount: parseFloat(counterValue) })
                }
            };

            // Prepare update data
            const updateData = {
                status: newStatus,
                lastUpdated: new Date(),
                messages: arrayUnion(responseMsg)
            };

            // If offer is accepted, prepare for payment integration
            if (action === 'accept') {
                updateData.acceptedPrice = order.offerAmount; // Store the accepted price
                updateData.paymentStatus = 'pending_payment';
                updateData.readyForCheckout = true;

                // Add payment details for integration with existing payment system
                updateData.paymentDetails = {
                    finalAmount: order.offerAmount,
                    originalPrice: order.originalPrice,
                    savings: order.originalPrice - order.offerAmount,
                    acceptedAt: new Date(),
                    paymentMethod: 'qr_payment', // Default to QR payment
                    isOfferPayment: true // Flag to identify this as an offer payment
                };
            }

            // If counter offer, add counter amount
            if (action === 'counter') {
                updateData.counterAmount = parseFloat(counterValue);
                updateData.lastCounterOffer = parseFloat(counterValue);
            }

            console.log('💾 Updating order with:', updateData);
            await updateDoc(doc(db, 'orders', order.id), updateData);

            // Update offer document if it exists
            if (order.offerId) {
                console.log('💾 Updating offer document:', order.offerId);
                const offerUpdateData = {
                    status: action === 'accept' ? 'accepted' :
                        action === 'reject' ? 'rejected' : 'countered',
                    respondedAt: new Date(),
                    ...(action === 'counter' && { counterAmount: parseFloat(counterValue) })
                };

                // If accepted, add payment tracking to offer
                if (action === 'accept') {
                    offerUpdateData.acceptedPrice = order.offerAmount;
                    offerUpdateData.paymentStatus = 'pending';
                }

                await updateDoc(doc(db, 'offers', order.offerId), offerUpdateData);
            }

            // 🛒 If offer is accepted, the order status change will be picked up by Cart.js
            if (action === 'accept') {
                console.log('✅ Offer accepted - buyer will see this in their cart automatically');
            }

            console.log(`✅ Offer ${action}ed successfully`);

            // Reset counter input
            setShowCounterInput(false);
            setCounterAmount('');

            // Notify parent component of update
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error(`❌ Error ${action}ing offer:`, error);
            alert(`Failed to ${action} offer. Please try again.`);
        } finally {
            setProcessing(null);
        }
    };

    const handleCounterSubmit = () => {
        const counterValue = parseFloat(counterAmount);
        if (!counterValue || counterValue <= 0) {
            alert('Please enter a valid counter amount');
            return;
        }
        if (counterValue >= order.originalPrice) {
            alert('Counter amount should be less than original price');
            return;
        }
        handleOfferResponse('counter', counterValue);
    };

    return (
        <div className="offer-response-card">
            <div className="offer-header">
                <h4>💰 Offer Received</h4>
                <span className="offer-status pending">Awaiting Response</span>
            </div>

            <div className="offer-details">
                <div className="offer-product">
                    {order.productImage && (
                        <img
                            src={order.productImage}
                            alt={order.productName}
                            className="offer-product-img"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    )}
                    <div className="offer-product-info">
                        <h5>{order.productName}</h5>
                        <p className="buyer-name">From: {order.buyerName}</p>
                    </div>
                </div>

                <div className="price-comparison">
                    <div className="price-row">
                        <span className="price-label">Your Price:</span>
                        <span className="price-value original">RM {order.originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="price-row">
                        <span className="price-label">Their Offer:</span>
                        <span className="price-value offer">RM {order.offerAmount.toFixed(2)}</span>
                    </div>
                    <div className="price-row savings">
                        <span className="price-label">Difference:</span>
                        <span className="price-value">-RM {(order.originalPrice - order.offerAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {!showCounterInput ? (
                <div className="offer-actions">
                    <button
                        className="offer-btn accept-btn"
                        onClick={() => handleOfferResponse('accept')}
                        disabled={processing}
                    >
                        {processing === 'accept' ? '⏳ Accepting...' : '✅ Accept Offer'}
                    </button>

                    <button
                        className="offer-btn counter-btn"
                        onClick={() => setShowCounterInput(true)}
                        disabled={processing}
                    >
                        🔄 Counter Offer
                    </button>

                    <button
                        className="offer-btn reject-btn"
                        onClick={() => handleOfferResponse('reject')}
                        disabled={processing}
                    >
                        {processing === 'reject' ? '⏳ Declining...' : '❌ Decline'}
                    </button>
                </div>
            ) : (
                <div className="counter-offer-section">
                    <h5>🔄 Make Counter Offer</h5>
                    <div className="counter-input-group">
                        <span className="currency">RM</span>
                        <input
                            type="number"
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            placeholder="Enter counter amount"
                            step="0.01"
                            min="0.01"
                            max={order.originalPrice - 0.01}
                            className="counter-input"
                        />
                    </div>
                    <div className="counter-actions">
                        <button
                            className="offer-btn counter-submit-btn"
                            onClick={handleCounterSubmit}
                            disabled={processing}
                        >
                            {processing === 'counter' ? '⏳ Sending...' : '📤 Send Counter'}
                        </button>
                        <button
                            className="offer-btn cancel-btn"
                            onClick={() => {
                                setShowCounterInput(false);
                                setCounterAmount('');
                            }}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OfferResponseCard;
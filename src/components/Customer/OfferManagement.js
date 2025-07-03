// src/components/Customer/OfferManagement.js
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './OfferManagement.css';

function OfferManagement({ showModal, onClose }) {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingOffer, setProcessingOffer] = useState(null);
    const [filter, setFilter] = useState('pending'); // pending, all, accepted, rejected
    const user = auth.currentUser;

    useEffect(() => {
        if (!user || !showModal) return;

        console.log('📥 Setting up offers listener for seller:', user.uid);

        // Set up real-time listener for offers where user is the seller
        const offersQuery = query(
            collection(db, 'offers'),
            where('sellerId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
            const offersData = [];
            snapshot.forEach((doc) => {
                offersData.push({ id: doc.id, ...doc.data() });
            });

            console.log('📊 Loaded', offersData.length, 'offers for seller');
            setOffers(offersData);
            setLoading(false);
        }, (error) => {
            console.error('❌ Error loading offers:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, showModal]);

    const handleOfferResponse = async (offer, action, counterAmount = null) => {
        if (!user || processingOffer) return;

        setProcessingOffer(offer.id);

        try {
            const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';

            // Update offer status
            const offerUpdate = {
                status: newStatus,
                respondedAt: new Date(),
                ...(counterAmount && { counterAmount: parseFloat(counterAmount) })
            };

            await updateDoc(doc(db, 'offers', offer.id), offerUpdate);

            // Create notification message to buyer
            let notificationMessage = '';
            let messageType = '';

            if (action === 'accept') {
                notificationMessage = `🎉 Offer Accepted!\n\nGreat news! Your offer of RM ${offer.offerAmount.toFixed(2)} for "${offer.productName}" has been accepted!\n\nOriginal Price: RM ${offer.originalPrice.toFixed(2)}\nYour Offer: RM ${offer.offerAmount.toFixed(2)}\nYou Save: RM ${(offer.originalPrice - offer.offerAmount).toFixed(2)}\n\nYou can now proceed with payment at the agreed price.`;
                messageType = 'offer_accepted';
            } else if (action === 'reject') {
                notificationMessage = `❌ Offer Declined\n\nYour offer of RM ${offer.offerAmount.toFixed(2)} for "${offer.productName}" has been declined.\n\nDon't worry! You can make another offer with a different amount.`;
                messageType = 'offer_rejected';
            } else if (action === 'counter') {
                notificationMessage = `🔄 Counter Offer Received!\n\nThe seller has made a counter offer for "${offer.productName}":\n\nYour Original Offer: RM ${offer.offerAmount.toFixed(2)}\nSeller's Counter Offer: RM ${counterAmount.toFixed(2)}\nOriginal Price: RM ${offer.originalPrice.toFixed(2)}\n\nWould you like to accept this counter offer?`;
                messageType = 'offer_countered';
            }

            // Add notification to buyer
            await addDoc(collection(db, 'notifications'), {
                type: messageType,
                offerId: offer.id,
                recipientId: offer.buyerId,
                recipientName: offer.buyerName,
                recipientEmail: offer.buyerEmail,
                senderId: user.uid,
                senderName: user.displayName || user.email,
                senderType: 'seller',
                productId: offer.productId,
                productName: offer.productName,
                originalPrice: offer.originalPrice,
                offerAmount: offer.offerAmount,
                ...(counterAmount && { counterAmount: parseFloat(counterAmount) }),
                message: notificationMessage,
                timestamp: new Date(),
                read: false,
                title: action === 'accept' ? 'Offer Accepted! 🎉' :
                    action === 'reject' ? 'Offer Declined' :
                        'Counter Offer Received',
                body: action === 'accept' ? `Your offer of RM ${offer.offerAmount.toFixed(2)} was accepted!` :
                    action === 'reject' ? `Your offer of RM ${offer.offerAmount.toFixed(2)} was declined.` :
                        `Counter offer: RM ${counterAmount.toFixed(2)}`,
                metadata: {
                    isOfferResponse: true,
                    offerStatus: newStatus
                }
            });

            console.log(`✅ Offer ${action}ed successfully:`, offer.id);

            const actionText = action === 'accept' ? 'accepted' :
                action === 'reject' ? 'declined' : 'countered';
            alert(`✅ Offer ${actionText} successfully! The buyer has been notified.`);

        } catch (error) {
            console.error(`❌ Error ${action}ing offer:`, error);
            alert(`Failed to ${action} offer. Please try again.`);
        } finally {
            setProcessingOffer(null);
        }
    };

    const filteredOffers = offers.filter(offer => {
        if (filter === 'all') return true;
        return offer.status === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ff9800';
            case 'accepted': return '#4caf50';
            case 'rejected': return '#f44336';
            case 'countered': return '#2196f3';
            case 'expired': return '#9e9e9e';
            default: return '#757575';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'accepted': return '✅';
            case 'rejected': return '❌';
            case 'countered': return '🔄';
            case 'expired': return '⏰';
            default: return '📄';
        }
    };

    const formatCurrency = (amount) => {
        return `RM ${parseFloat(amount).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!showModal) return null;

    return (
        <div className="offer-management-overlay" onClick={onClose}>
            <div className="offer-management-modal" onClick={(e) => e.stopPropagation()}>
                <div className="offer-management-header">
                    <h2>💰 Manage Offers</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="offer-management-content">
                    {/* Filter Tabs */}
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilter('pending')}
                        >
                            ⏳ Pending ({offers.filter(o => o.status === 'pending').length})
                        </button>
                        <button
                            className={`filter-tab ${filter === 'accepted' ? 'active' : ''}`}
                            onClick={() => setFilter('accepted')}
                        >
                            ✅ Accepted ({offers.filter(o => o.status === 'accepted').length})
                        </button>
                        <button
                            className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
                            onClick={() => setFilter('rejected')}
                        >
                            ❌ Declined ({offers.filter(o => o.status === 'rejected').length})
                        </button>
                        <button
                            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            📄 All ({offers.length})
                        </button>
                    </div>

                    {/* Offers List */}
                    <div className="offers-list">
                        {loading ? (
                            <div className="loading-offers">
                                <div className="spinner"></div>
                                <p>Loading your offers...</p>
                            </div>
                        ) : filteredOffers.length === 0 ? (
                            <div className="no-offers">
                                <span className="empty-icon">💰</span>
                                <h3>No {filter !== 'all' ? filter : ''} offers found</h3>
                                <p>
                                    {filter === 'pending'
                                        ? "You don't have any pending offers at the moment."
                                        : `No ${filter} offers to display.`
                                    }
                                </p>
                            </div>
                        ) : (
                            filteredOffers.map((offer) => (
                                <OfferCard
                                    key={offer.id}
                                    offer={offer}
                                    onRespond={handleOfferResponse}
                                    isProcessing={processingOffer === offer.id}
                                    formatCurrency={formatCurrency}
                                    formatDate={formatDate}
                                    getStatusColor={getStatusColor}
                                    getStatusIcon={getStatusIcon}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Individual Offer Card Component
function OfferCard({ offer, onRespond, isProcessing, formatCurrency, formatDate, getStatusColor, getStatusIcon }) {
    const [showCounterInput, setShowCounterInput] = useState(false);
    const [counterAmount, setCounterAmount] = useState('');

    const savings = offer.originalPrice - offer.offerAmount;
    const savingsPercentage = ((savings / offer.originalPrice) * 100).toFixed(1);

    const handleCounterOffer = () => {
        if (!counterAmount || parseFloat(counterAmount) <= 0) {
            alert('Please enter a valid counter offer amount');
            return;
        }

        onRespond(offer, 'counter', parseFloat(counterAmount));
        setShowCounterInput(false);
        setCounterAmount('');
    };

    return (
        <div className="offer-card">
            <div className="offer-header">
                <div className="offer-product">
                    {offer.productImage && (
                        <img src={offer.productImage} alt={offer.productName} className="offer-product-image" />
                    )}
                    <div className="offer-product-info">
                        <h4>{offer.productName}</h4>
                        <p className="offer-buyer">From: {offer.buyerName}</p>
                        <p className="offer-date">{formatDate(offer.createdAt)}</p>
                    </div>
                </div>

                <div className="offer-status">
                    <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(offer.status) }}
                    >
                        {getStatusIcon(offer.status)} {offer.status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="offer-pricing">
                <div className="price-comparison">
                    <div className="price-item">
                        <span className="price-label">Original Price</span>
                        <span className="price-value original">{formatCurrency(offer.originalPrice)}</span>
                    </div>
                    <div className="price-item">
                        <span className="price-label">Offer Amount</span>
                        <span className="price-value offer">{formatCurrency(offer.offerAmount)}</span>
                    </div>
                    <div className="price-item">
                        <span className="price-label">Buyer Saves</span>
                        <span className="price-value savings">
                            {formatCurrency(savings)} ({savingsPercentage}%)
                        </span>
                    </div>
                </div>
            </div>

            {offer.message && (
                <div className="offer-message">
                    <h5>💬 Buyer's Message:</h5>
                    <p>"{offer.message}"</p>
                </div>
            )}

            {offer.status === 'pending' && (
                <div className="offer-actions">
                    {!showCounterInput ? (
                        <div className="action-buttons">
                            <button
                                className="accept-btn"
                                onClick={() => onRespond(offer, 'accept')}
                                disabled={isProcessing}
                            >
                                ✅ Accept Offer
                            </button>
                            <button
                                className="counter-btn"
                                onClick={() => setShowCounterInput(true)}
                                disabled={isProcessing}
                            >
                                🔄 Counter Offer
                            </button>
                            <button
                                className="reject-btn"
                                onClick={() => onRespond(offer, 'reject')}
                                disabled={isProcessing}
                            >
                                ❌ Decline
                            </button>
                        </div>
                    ) : (
                        <div className="counter-offer-input">
                            <h5>🔄 Make Counter Offer:</h5>
                            <div className="counter-input-group">
                                <span className="currency-symbol">RM</span>
                                <input
                                    type="number"
                                    value={counterAmount}
                                    onChange={(e) => setCounterAmount(e.target.value)}
                                    placeholder="Enter counter amount"
                                    step="0.01"
                                    min="0.01"
                                    max={offer.originalPrice}
                                />
                            </div>
                            <div className="counter-actions">
                                <button
                                    className="submit-counter-btn"
                                    onClick={handleCounterOffer}
                                    disabled={isProcessing}
                                >
                                    📤 Send Counter
                                </button>
                                <button
                                    className="cancel-counter-btn"
                                    onClick={() => {
                                        setShowCounterInput(false);
                                        setCounterAmount('');
                                    }}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isProcessing && (
                <div className="processing-overlay">
                    <div className="spinner-small"></div>
                    <span>Processing...</span>
                </div>
            )}
        </div>
    );
}

export default OfferManagement;
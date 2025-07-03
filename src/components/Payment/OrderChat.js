// src/components/Pages/OrderChat.js - Modified to support offers, donations and regular orders
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, increment } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import DonationVerification from '../Payment/DonationVerification'; // ✅ Existing donation verification
import OfferResponseCard from '../Chat/OfferResponseCard'; // ✅ NEW: Import offer response
import './OrderChat.css';

const OrderChat = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [userType, setUserType] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const messagesEndRef = useRef(null);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!orderId) {
            setError('Order ID not provided');
            setLoading(false);
            return;
        }

        // Set up real-time listener for the order
        const orderRef = doc(db, 'orders', orderId);
        const unsubscribe = onSnapshot(orderRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
                    console.log('📨 Order chat updated:', orderData.messages?.length, 'messages');

                    // ✅ Enhanced user type determination for donations AND offers
                    if (orderData.buyerId === user.uid) {
                        if (orderData.orderType === 'donation') {
                            setUserType('donor');
                        } else if (orderData.type === 'offer') {
                            setUserType('buyer'); // Buyer in offer context
                        } else {
                            setUserType('buyer'); // Regular buyer
                        }
                    } else if (orderData.sellerId === user.uid) {
                        if (orderData.orderType === 'donation') {
                            setUserType('campaign_creator');
                        } else if (orderData.type === 'offer') {
                            setUserType('seller'); // Seller in offer context
                        } else {
                            setUserType('seller'); // Regular seller
                        }
                    } else {
                        setError('You are not authorized to view this order');
                        setLoading(false);
                        return;
                    }

                    setOrder(orderData);
                    setLoading(false);

                    // Mark messages as read
                    markMessagesAsRead(orderData);
                } else {
                    setError('Order not found');
                    setLoading(false);
                }
            },
            (error) => {
                console.error('❌ Error listening to order:', error);
                setError('Failed to load order data');
                setLoading(false);
            }
        );

        return () => {
            console.log('🧹 Cleaning up order chat listener');
            unsubscribe();
        };
    }, [orderId, user, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [order?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const markMessagesAsRead = async (orderData) => {
        if (!orderData.messages || !user) return;

        try {
            const hasUnreadMessages = orderData.messages.some(
                msg => !msg.read && msg.senderId !== user.uid
            );

            if (hasUnreadMessages) {
                console.log('👁️ Marking messages as read in OrderChat');
                const updatedMessages = orderData.messages.map(msg => ({
                    ...msg,
                    read: msg.senderId === user.uid ? msg.read : true
                }));

                await updateDoc(doc(db, 'orders', orderId), {
                    messages: updatedMessages,
                    lastUpdated: new Date()
                });
            }
        } catch (error) {
            console.error('❌ Error marking messages as read:', error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || sending) return;

        try {
            setSending(true);
            console.log('📤 Sending message from OrderChat');

            const messageData = {
                senderId: user.uid,
                senderName: user.displayName || user.email,
                senderType: userType,
                message: newMessage.trim(),
                timestamp: new Date(),
                read: false
            };

            await updateDoc(doc(db, 'orders', orderId), {
                messages: arrayUnion(messageData),
                lastUpdated: new Date()
            });

            setNewMessage('');
            console.log('✅ Message sent successfully from OrderChat');
        } catch (error) {
            console.error('❌ Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString('en-MY', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '';
        }
    };

    const formatCurrency = (amount) => {
        return `RM ${parseFloat(amount).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const getStatusColor = (status) => {
        const colors = {
            // ✅ Offer statuses
            'offer_pending': '#ff9800',
            'offer_accepted': '#4caf50',
            'offer_rejected': '#f44336',
            'offer_countered': '#2196f3',
            // Existing statuses
            'pending_verification': '#ff9800',
            'pending_payment': '#ff9800',
            'pending_meetup': '#2196f3',
            'confirmed': '#4caf50',
            'completed': '#4caf50',
            'cancelled': '#f44336',
            'rejected': '#f44336',
            'disputed': '#e91e63'
        };
        return colors[status] || '#757575';
    };

    const getStatusIcon = (status) => {
        const icons = {
            // ✅ Offer statuses  
            'offer_pending': '💰',
            'offer_accepted': '✅',
            'offer_rejected': '❌',
            'offer_countered': '🔄',
            // Existing statuses
            'pending_verification': '⏳',
            'pending_payment': '💳',
            'pending_meetup': '🤝',
            'confirmed': '✅',
            'completed': '🎉',
            'cancelled': '❌',
            'rejected': '❌',
            'disputed': '⚠️'
        };
        return icons[status] || '📦';
    };

    // Image modal functions
    const openImageModal = (imageUrl) => {
        setSelectedImage(imageUrl);
    };

    const closeImageModal = () => {
        setSelectedImage(null);
    };

    // Handle escape key to close modal
    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                closeImageModal();
            }
        };

        if (selectedImage) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [selectedImage]);

    // ✅ Handle donation verification completion
    const handleVerificationComplete = (result) => {
        console.log('✅ Donation verification completed:', result);
    };

    // ✅ NEW: Handle offer response completion  
    const handleOfferResponse = () => {
        console.log('✅ Offer response completed, order will auto-update');
        // Order updates will come through the real-time listener
    };

    // Render message with attachments
    const renderMessage = (message, index) => {
        const isOwnMessage = message.senderId === user.uid;
        const isSystemMessage = message.senderType === 'system';
        // ✅ NEW: Check for offer message types
        const isOfferMessage = message.messageType === 'offer_notification' || message.messageType === 'offer_response';

        return (
            <div
                key={`${message.timestamp?.seconds || Date.now()}-${index}`}
                className={`message ${isOwnMessage ? 'own-message' : 'other-message'} ${isSystemMessage ? 'system-message' : ''} ${isOfferMessage ? `offer-message ${message.messageType}` : ''}`}
            >
                <div className="message-header">
                    <span className="sender-name">
                        {isSystemMessage ? '🤖 System' : (isOwnMessage ? 'You' : message.senderName)}
                    </span>
                    <span className="sender-type">
                        ({message.senderType})
                    </span>
                    <span className="message-time">
                        {formatTime(message.timestamp)}
                    </span>
                </div>

                <div className="message-content">
                    <div className="message-text">
                        {/* Handle multi-line messages for donations and offers */}
                        {message.message.split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>

                    {/* Display image attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="message-attachments">
                            {message.attachments.map((attachment, attIndex) => (
                                attachment.type === 'image' && (
                                    <div key={attIndex} className="image-attachment">
                                        <div className="attachment-header">
                                            <span className="attachment-icon">📸</span>
                                            <span className="attachment-caption">
                                                {attachment.caption || attachment.filename || 'Image Attachment'}
                                            </span>
                                        </div>
                                        <div
                                            className="image-preview"
                                            onClick={() => openImageModal(attachment.url)}
                                        >
                                            <img
                                                src={attachment.url}
                                                alt={attachment.caption || 'Attachment'}
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    console.error('Failed to load image:', attachment.url);
                                                }}
                                            />
                                            <div className="image-overlay">
                                                <span>🔍 Click to view full size</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Update order status
    const updateOrderStatus = async (newStatus) => {
        if (userType !== 'seller' && userType !== 'campaign_creator') return;

        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                lastUpdated: new Date()
            });

            // Send status update message
            const statusMessage = {
                senderId: user.uid,
                senderName: user.displayName || user.email,
                senderType: userType,
                message: `📋 ${order.orderType === 'donation' ? 'Donation' : order.type === 'offer' ? 'Offer' : 'Order'} status updated to: ${newStatus.replace('_', ' ').toUpperCase()}`,
                timestamp: new Date(),
                read: false,
                isSystemMessage: true
            };

            await updateDoc(doc(db, 'orders', orderId), {
                messages: arrayUnion(statusMessage)
            });

        } catch (error) {
            console.error('❌ Error updating order status:', error);
            alert('Failed to update order status');
        }
    };

    if (loading) {
        return (
            <div className="order-chat-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading conversation...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="order-chat-container">
                <div className="error-state">
                    <h2>❌ Error</h2>
                    <p>{error || 'Failed to load order'}</p>
                    <button onClick={() => navigate('/orders')} className="back-button">
                        ← Back to Orders
                    </button>
                </div>
            </div>
        );
    }

    // ✅ Enhanced other party info for donations AND offers
    const getDynamicOtherParty = () => {
        if (userType === 'buyer' || userType === 'donor') {
            return {
                name: order.sellerName,
                email: order.sellerEmail,
                role: order.orderType === 'donation' ? 'campaign_creator' :
                    order.type === 'offer' ? 'seller' : 'seller'
            };
        } else {
            return {
                name: order.buyerName,
                email: order.buyerEmail,
                role: order.orderType === 'donation' ? 'donor' :
                    order.type === 'offer' ? 'buyer' : 'buyer'
            };
        }
    };

    const otherParty = getDynamicOtherParty();

    // ✅ NEW: Check order types
    const isDonationOrder = order.orderType === 'donation';
    const isOfferOrder = order.type === 'offer';
    const isUserCampaignCreator = userType === 'campaign_creator';
    const isUserSeller = userType === 'seller';
    const isOfferPending = order.status === 'offer_pending';

    return (
        <div className="order-chat-container">
            {/* Order Header */}
            <div className="order-header">
                <div className="header-left">
                    <button
                        className="back-button"
                        onClick={() => navigate('/orders')}
                    >
                        ← Back
                    </button>
                    <div className="order-info">
                        {/* ✅ Enhanced header for offers, donations and regular orders */}
                        <h1>
                            {isDonationOrder ? '💝 Donation' :
                                isOfferOrder ? '💰 Offer' : '📦 Order'} #{order.id.slice(-8)}
                        </h1>
                        <div className="order-meta">
                            <span
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(order.status) }}
                            >
                                {getStatusIcon(order.status)} {order.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="total-amount">
                                {formatCurrency(
                                    isDonationOrder ? (order.donationAmount || order.totalAmount) :
                                        isOfferOrder ? (order.offerAmount || order.totalAmount) :
                                            order.totalAmount
                                )}
                                {/* ✅ Show original price for offers */}
                                {isOfferOrder && order.originalPrice && (
                                    <span className="original-price">
                                        (was {formatCurrency(order.originalPrice)})
                                    </span>
                                )}
                            </span>
                            <span className="payment-method">
                                {isDonationOrder ? '💝 Donation' :
                                    isOfferOrder ? '💰 Offer' :
                                        (order.paymentMethod === 'qr' ? '💳 QR Payment' : '🤝 Meetup')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="header-right">
                    <div className="other-party-info">
                        <span className="party-label">
                            {isDonationOrder
                                ? (isUserCampaignCreator ? 'Donor:' : 'Campaign Creator:')
                                : isOfferOrder
                                    ? (isUserSeller ? 'Buyer:' : 'Seller:')
                                    : (userType === 'buyer' ? 'Seller:' : 'Buyer:')
                            }
                        </span>
                        <span className="party-name">{otherParty.name}</span>
                        <span className="party-email">{otherParty.email}</span>
                    </div>

                    {/* ✅ Action buttons for regular orders, donations, and offers */}
                    {(userType === 'seller' || userType === 'campaign_creator') &&
                        order.status !== 'completed' &&
                        order.status !== 'cancelled' &&
                        order.status !== 'rejected' &&
                        order.status !== 'offer_accepted' &&
                        order.status !== 'offer_rejected' && (
                            <div className="seller-actions">
                                {/* Regular order actions */}
                                {!isDonationOrder && !isOfferOrder && order.status === 'pending_payment' && (
                                    <button
                                        className="action-btn confirm-payment"
                                        onClick={() => updateOrderStatus('confirmed')}
                                    >
                                        ✅ Confirm Payment
                                    </button>
                                )}
                                {!isDonationOrder && !isOfferOrder && order.status === 'confirmed' && (
                                    <button
                                        className="action-btn mark-completed"
                                        onClick={() => updateOrderStatus('completed')}
                                    >
                                        🎉 Mark as Completed
                                    </button>
                                )}
                            </div>
                        )}
                </div>
            </div>

            {/* ✅ Donation Verification Component */}
            {isDonationOrder && isUserCampaignCreator && order.status === 'pending_verification' && (
                <DonationVerification
                    order={order}
                    onVerificationComplete={handleVerificationComplete}
                />
            )}

            {/* ✅ NEW: Offer Response Component */}
            {isOfferOrder && isUserSeller && isOfferPending && (
                <div className="offer-response-section">
                    <OfferResponseCard
                        order={order}
                        onUpdate={handleOfferResponse}
                    />
                </div>
            )}

            {/* ✅ Enhanced Order/Donation/Offer Items Summary */}
            <div className="order-items-summary">
                {isDonationOrder ? (
                    // Donation summary
                    <>
                        <h3>💝 Donation Details</h3>
                        <div className="donation-summary">
                            <div className="donation-item">
                                <span className="item-name">Campaign: {order.campaignTitle}</span>
                                <span className="item-details">
                                    Donation Amount: {formatCurrency(order.donationAmount || order.totalAmount)}
                                </span>
                                {order.paymentDetails?.referenceNumber && (
                                    <span className="item-reference">
                                        Reference: {order.paymentDetails.referenceNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                ) : isOfferOrder ? (
                    // ✅ NEW: Offer summary
                    <>
                        <h3>💰 Offer Details</h3>
                        <div className="offer-summary">
                            <div className="offer-item">
                                <div className="offer-product-info">
                                    {order.productImage && (
                                        <img
                                            src={order.productImage}
                                            alt={order.productName}
                                            className="offer-product-image"
                                        />
                                    )}
                                    <div className="offer-details">
                                        <span className="item-name">Product: {order.productName}</span>
                                        <div className="price-comparison">
                                            <span className="original-price-detail">
                                                Original Price: {formatCurrency(order.originalPrice)}
                                            </span>
                                            <span className="offer-price-detail">
                                                Offer Amount: {formatCurrency(order.offerAmount)}
                                            </span>
                                            <span className="savings-detail">
                                                Potential Savings: {formatCurrency(order.originalPrice - order.offerAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    // Regular order summary
                    <>
                        <h3>📦 Order Items ({order.items?.length || 0})</h3>
                        <div className="items-list">
                            {order.items?.map((item, index) => (
                                <div key={index} className="order-item">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-details">
                                        Qty: {item.quantity} × {formatCurrency(item.price)}
                                    </span>
                                    <span className="item-total">
                                        {formatCurrency(item.price * item.quantity)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Messages Area */}
            <div className="messages-container">
                {order.messages && order.messages.length > 0 ? (
                    order.messages.map((message, index) => renderMessage(message, index))
                ) : (
                    <div className="no-messages">
                        <span className="no-messages-icon">💬</span>
                        <h3>No messages yet</h3>
                        <p>Start the conversation with {otherParty.role.replace('_', ' ')}</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="message-input-form">
                <div className="input-container">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Send a message to ${otherParty.role.replace('_', ' ')}...`}
                        disabled={sending}
                        maxLength={1000}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="send-button"
                        title="Send message (Enter)"
                    >
                        {sending ? '⏳' : '📤'}
                    </button>
                </div>
                <small className="character-count">
                    {1000 - newMessage.length} characters remaining • Press Enter to send
                </small>
            </form>

            {/* Image Modal */}
            {selectedImage && (
                <div className="image-modal" onClick={closeImageModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeImageModal}>
                            ✕
                        </button>
                        <img src={selectedImage} alt="Full size attachment" />
                        <div className="modal-actions">
                            <a
                                href={selectedImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="download-btn"
                                onClick={(e) => e.stopPropagation()}
                            >
                                📥 Download
                            </a>
                            <button
                                className="close-modal-btn"
                                onClick={closeImageModal}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderChat;
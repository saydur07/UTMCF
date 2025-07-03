// src/components/Chat/QuickChat.js - Complete Fixed Version
import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import OfferResponseCard from './OfferResponseCard';
import './QuickChat.css';

const QuickChat = ({ conversation, onBack, onViewFull }) => {
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [currentConversation, setCurrentConversation] = useState(conversation);
    const messagesEndRef = useRef(null);
    const user = auth.currentUser;
    const hasMarkedAsRead = useRef(false);

    // Set up real-time listener for this specific order
    useEffect(() => {
        if (!conversation?.orderId) return;

        console.log('🔥 QuickChat: Setting up real-time listener for order:', conversation.orderId);

        const orderRef = doc(db, 'orders', conversation.orderId);
        const unsubscribe = onSnapshot(orderRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
                    console.log('📨 QuickChat: Real-time update - messages:', orderData.messages?.length);

                    // Update the conversation with new data
                    const updatedConversation = {
                        ...currentConversation,
                        messages: orderData.messages || [],
                        order: orderData,
                        status: orderData.status,
                        type: orderData.type
                    };

                    setCurrentConversation(updatedConversation);

                    // Reset read status when new messages arrive
                    hasMarkedAsRead.current = false;
                } else {
                    console.log('❌ QuickChat: Order document no longer exists');
                }
            },
            (error) => {
                console.error('❌ QuickChat: Error listening to order updates:', error);
            }
        );

        return () => {
            console.log('🧹 QuickChat: Cleaning up real-time listener');
            unsubscribe();
        };
    }, [conversation?.orderId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [currentConversation.messages]);

    // Mark messages as read when they're viewed (with debouncing)
    useEffect(() => {
        const markAsReadTimer = setTimeout(() => {
            if (!hasMarkedAsRead.current) {
                markMessagesAsRead();
                hasMarkedAsRead.current = true;
            }
        }, 1000); // Wait 1 second before marking as read

        return () => clearTimeout(markAsReadTimer);
    }, [currentConversation.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const markMessagesAsRead = async () => {
        if (!currentConversation.messages || !user) return;

        try {
            const unreadMessages = currentConversation.messages.filter(
                msg => !msg.read && msg.senderId !== user.uid
            );

            if (unreadMessages.length > 0) {
                console.log('👁️ QuickChat: Marking', unreadMessages.length, 'messages as read');

                const updatedMessages = currentConversation.messages.map(msg => ({
                    ...msg,
                    read: msg.senderId === user.uid ? msg.read : true // Mark others' messages as read
                }));

                await updateDoc(doc(db, 'orders', currentConversation.orderId), {
                    messages: updatedMessages,
                    lastUpdated: new Date()
                });

                console.log('✅ QuickChat: Messages marked as read successfully');
            }
        } catch (error) {
            console.error('❌ QuickChat: Error marking messages as read:', error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || sending) return;

        const messageText = newMessage.trim();

        try {
            setSending(true);
            setNewMessage(''); // Clear input immediately for better UX

            console.log('📤 QuickChat: Sending message:', messageText);

            const messageData = {
                senderId: user.uid,
                senderName: currentConversation.userRole === 'buyer'
                    ? currentConversation.order.buyerName
                    : currentConversation.order.sellerName,
                senderType: currentConversation.userRole,
                message: messageText,
                timestamp: new Date(),
                read: false
            };


            const optimisticConversation = {
                ...currentConversation,
                messages: [...currentConversation.messages, messageData]
            };
            setCurrentConversation(optimisticConversation);


            await updateDoc(doc(db, 'orders', currentConversation.orderId), {
                messages: arrayUnion(messageData),
                lastUpdated: new Date()
            });

            console.log('✅ QuickChat: Message sent successfully');


            hasMarkedAsRead.current = false;

        } catch (error) {
            console.error('❌ QuickChat: Error sending message:', error);
            alert('Failed to send message. Please try again.');

            setNewMessage(messageText);

            setCurrentConversation(conversation);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleTimeString('en-MY', {
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

    //  Check if this is an offer conversation and user is seller
    const isOfferConversation = currentConversation.type === 'offer';
    const isSellerInOffer = isOfferConversation && currentConversation.userRole === 'seller';
    const isOfferPending = currentConversation.status === 'offer_pending';

    // Debug logging to help troubleshoot
    console.log('🔍 QuickChat offer check:', {
        conversationType: currentConversation.type,
        userRole: currentConversation.userRole,
        status: currentConversation.status,
        isOfferConversation,
        isSellerInOffer,
        isOfferPending,
        shouldShowCard: isSellerInOffer && isOfferPending,
        orderData: currentConversation.order
    });

    return (
        <div className="quick-chat">
            {/* Header */}
            <div className="quick-chat-header">
                <button className="back-btn" onClick={onBack}>
                    ← Back
                </button>
                <div className="chat-title">
                    <div className="other-party-name">
                        {currentConversation.otherParty.name || currentConversation.otherParty.email}
                    </div>
                    <div className="order-info-mini">
                        {isOfferConversation ? (
                            <>
                                💰 Offer: {formatCurrency(currentConversation.order?.offerAmount || currentConversation.totalAmount)}
                                {currentConversation.order?.originalPrice && (
                                    <span className="original-price-mini">
                                        (was {formatCurrency(currentConversation.order.originalPrice)})
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                #{currentConversation.orderNumber} • {formatCurrency(currentConversation.totalAmount)}
                            </>
                        )}
                        <span className="user-role-indicator">
                            ({currentConversation.userRole === 'buyer' ? '👤 Buyer' : '🏪 Seller'})
                        </span>
                    </div>
                </div>
                <button className="expand-btn" onClick={onViewFull} title="Open full chat">
                    🔍
                </button>
            </div>

            {/* 💰 Offer Response Card - Show for sellers with pending offers */}
            {isSellerInOffer && isOfferPending && (
                <OfferResponseCard
                    order={{
                        id: currentConversation.orderId,
                        type: currentConversation.type,
                        status: currentConversation.status,
                        offerId: currentConversation.order?.offerId,
                        productId: currentConversation.order?.productId,
                        productName: currentConversation.order?.productName,
                        productImage: currentConversation.order?.productImage,
                        originalPrice: currentConversation.order?.originalPrice,
                        offerAmount: currentConversation.order?.offerAmount,
                        buyerId: currentConversation.order?.buyerId,
                        buyerName: currentConversation.order?.buyerName,
                        buyerEmail: currentConversation.order?.buyerEmail,
                        sellerId: currentConversation.order?.sellerId,
                        sellerName: currentConversation.order?.sellerName,
                        sellerEmail: currentConversation.order?.sellerEmail,
                    }}
                    onUpdate={() => {
                        // Force a refresh of the conversation
                        console.log('🔄 Offer response submitted, conversation will auto-update');
                    }}
                />
            )}

            {/* Messages */}
            <div className="quick-messages-container">
                {currentConversation.messages.length === 0 ? (
                    <div className="no-messages-quick">
                        <span className="chat-icon">💬</span>
                        <p>Start your conversation</p>
                        <small>Your messages will appear here</small>
                    </div>
                ) : (
                    currentConversation.messages.map((message, index) => (
                        <div
                            key={`${message.timestamp?.seconds || Date.now()}-${index}`}
                            className={`quick-message ${message.senderId === user.uid ? 'own-message' : 'other-message'
                                } ${message.messageType ? `message-type-${message.messageType}` : ''}`}
                        >
                            <div className="message-content">
                                {message.message}
                            </div>
                            <div className="message-time">
                                {formatTime(message.timestamp)}
                                {message.senderId === user.uid && (
                                    <span className="message-status">
                                        {sending && index === currentConversation.messages.length - 1 ? (
                                            <span className="sending-indicator">Sending...</span>
                                        ) : (
                                            <span className="sent-indicator">✓</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="quick-message-form">
                <div className="quick-input-container">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${currentConversation.otherParty.role} about this ${isOfferConversation ? 'offer' : 'order'}...`}
                        disabled={sending}
                        maxLength={500}
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
                        className="quick-send-btn"
                        title="Send message (Enter)"
                    >
                        {sending ? '⏳' : '📤'}
                    </button>
                </div>
                <small className="help-text">
                    Press Enter to send • {500 - newMessage.length} characters left
                </small>
            </form>

            {/* Quick Actions */}
            <div className="quick-actions">
                <button
                    className="quick-action-btn"
                    onClick={onViewFull}
                    title="Open full chat with order management"
                >
                    💬 Full Chat & Details
                </button>

                {currentConversation.userRole === 'seller' &&
                    currentConversation.status !== 'completed' &&
                    currentConversation.status !== 'cancelled' && (
                        <button
                            className="quick-action-btn manage-order"
                            onClick={onViewFull}
                            title="Manage order status and details"
                        >
                            ⚙️ Manage {isOfferConversation ? 'Offer' : 'Order'}
                        </button>
                    )}
            </div>
        </div>
    );
};

export default QuickChat;
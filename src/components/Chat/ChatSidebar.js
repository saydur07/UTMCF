// src/components/Chat/ChatSidebar.js - Improved with better real-time updates
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import QuickChat from './QuickChat';
import './ChatSidebar.css';

const ChatSidebar = () => {
    const navigate = useNavigate();
    const {
        conversations,
        chatSidebarOpen,
        closeChatSidebar,
        loading
    } = useChat();

    const [selectedConversation, setSelectedConversation] = useState(null);
    const [showQuickChat, setShowQuickChat] = useState(false);

    // ✅ Update selected conversation when conversations change
    useEffect(() => {
        if (selectedConversation && conversations.length > 0) {
            // Find the updated version of the selected conversation
            const updatedConversation = conversations.find(
                conv => conv.orderId === selectedConversation.orderId
            );

            if (updatedConversation) {
                console.log('🔄 Updating selected conversation with new data');
                setSelectedConversation(updatedConversation);
            }
        }
    }, [conversations, selectedConversation]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now - date;

            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;

            return date.toLocaleDateString('en-MY', {
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return '';
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending_payment': '#ff9800',
            'pending_meetup': '#2196f3',
            'confirmed': '#4caf50',
            'completed': '#4caf50',
            'cancelled': '#f44336',
            'disputed': '#e91e63'
        };
        return colors[status] || '#757575';
    };

    const getStatusIcon = (status) => {
        const icons = {
            'pending_payment': '💳',
            'pending_meetup': '🤝',
            'confirmed': '✅',
            'completed': '🎉',
            'cancelled': '❌',
            'disputed': '⚠️'
        };
        return icons[status] || '📦';
    };

    const truncateMessage = (message, maxLength = 50) => {
        if (!message || message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    };

    const handleConversationClick = (conversation) => {
        console.log('💬 Opening conversation:', conversation.orderId);
        setSelectedConversation(conversation);
        setShowQuickChat(true);
    };

    const handleViewFullChat = (orderId) => {
        console.log('🔍 Opening full chat for order:', orderId);
        closeChatSidebar();
        navigate(`/order/${orderId}`);
    };

    const handleBackToList = () => {
        console.log('⬅️ Going back to conversation list');
        setShowQuickChat(false);
        setSelectedConversation(null);
    };

    if (!chatSidebarOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="chat-backdrop" onClick={closeChatSidebar} />

            {/* Chat Sidebar */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h3>💬 Messages {conversations.length > 0 && `(${conversations.length})`}</h3>
                    <button className="close-chat-btn" onClick={closeChatSidebar}>
                        ✕
                    </button>
                </div>

                {showQuickChat && selectedConversation ? (
                    <QuickChat
                        conversation={selectedConversation}
                        onBack={handleBackToList}
                        onViewFull={() => handleViewFullChat(selectedConversation.orderId)}
                    />
                ) : (
                    <div className="chat-sidebar-content">
                        {loading ? (
                            <div className="chat-loading">
                                <div className="spinner-small"></div>
                                <p>Loading conversations...</p>
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="no-conversations">
                                <div className="empty-state">
                                    <span className="empty-icon">💬</span>
                                    <h4>No conversations yet</h4>
                                    <p>Your order conversations will appear here</p>
                                    <small>Place an order to start chatting with sellers!</small>
                                </div>
                            </div>
                        ) : (
                            <div className="conversations-list">
                                {conversations.map((conversation) => (
                                    <div
                                        key={conversation.orderId}
                                        className={`conversation-item ${conversation.unreadCount > 0 ? 'has-unread' : ''}`}
                                        onClick={() => handleConversationClick(conversation)}
                                    >
                                        <div className="conversation-avatar">
                                            <span className="avatar-initial">
                                                {conversation.otherParty.name?.charAt(0)?.toUpperCase() ||
                                                    conversation.otherParty.email?.charAt(0)?.toUpperCase() ||
                                                    '?'}
                                            </span>
                                            <span className="role-badge">
                                                {conversation.otherParty.role === 'buyer' ? '👤' : '🏪'}
                                            </span>
                                        </div>

                                        <div className="conversation-content">
                                            <div className="conversation-header">
                                                <div className="conversation-name">
                                                    {conversation.otherParty.name || conversation.otherParty.email}
                                                </div>
                                                <div className="conversation-time">
                                                    {formatTime(conversation.lastUpdated)}
                                                </div>
                                            </div>

                                            <div className="conversation-preview">
                                                <div className="order-info">
                                                    <span className="order-number">
                                                        #{conversation.orderNumber}
                                                    </span>
                                                    <span
                                                        className="status-dot"
                                                        style={{ backgroundColor: getStatusColor(conversation.status) }}
                                                        title={conversation.status?.replace('_', ' ').toUpperCase()}
                                                    >
                                                        {getStatusIcon(conversation.status)}
                                                    </span>
                                                    <span className="payment-method">
                                                        {conversation.paymentMethod === 'qr' ? '💳' : '🤝'}
                                                    </span>
                                                </div>

                                                <div className="last-message">
                                                    {conversation.lastMessage ? (
                                                        <span className={`message-text ${conversation.unreadCount > 0 ? 'unread-message' : ''}`}>
                                                            {conversation.lastMessage.senderId === conversation.otherParty.id
                                                                ? truncateMessage(conversation.lastMessage.message)
                                                                : `You: ${truncateMessage(conversation.lastMessage.message)}`
                                                            }
                                                        </span>
                                                    ) : (
                                                        <span className="no-messages">No messages yet</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {conversation.unreadCount > 0 && (
                                            <div className="unread-badge">
                                                {conversation.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="chat-sidebar-footer">
                            <button
                                className="view-all-btn"
                                onClick={() => {
                                    closeChatSidebar();
                                    navigate('/orders');
                                }}
                            >
                                📦 View All Orders
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ChatSidebar;
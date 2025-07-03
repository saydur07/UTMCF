// src/components/Chat/ChatTrigger.js - Floating chat button
import React from 'react';
import { useChat } from '../../context/ChatContext';
import './ChatTrigger.css';

const ChatTrigger = () => {
    const { conversations, openChatSidebar, getTotalUnreadCount } = useChat();

    const unreadCount = getTotalUnreadCount ? getTotalUnreadCount() : 0;

    return (
        <button
            className="chat-trigger-btn"
            onClick={openChatSidebar}
            title={`Open messages ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
            <div className="chat-icon">
                💬
            </div>
            {unreadCount > 0 && (
                <div className="chat-notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </div>
            )}
        </button>
    );
};

export default ChatTrigger;
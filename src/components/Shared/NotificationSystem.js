// src/components/Shared/NotificationSystem.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './NotificationSystem.css';

function NotificationSystem() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user?.uid) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        console.log('🔔 Setting up notifications listener for user:', user.uid);

        // Set up real-time listener for notifications
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = [];
            let unreadCounter = 0;

            snapshot.forEach((doc) => {
                const notification = { id: doc.id, ...doc.data() };
                notificationsData.push(notification);

                if (!notification.read) {
                    unreadCounter++;
                }
            });

            console.log('🔔 Notifications updated:', notificationsData.length, 'total,', unreadCounter, 'unread');

            setNotifications(notificationsData.slice(0, 20)); // Keep only latest 20
            setUnreadCount(unreadCounter);
            setLoading(false);

            // Play notification sound for new notifications
            const prevCount = parseInt(sessionStorage.getItem('prevNotificationCount') || '0');
            if (unreadCounter > prevCount && prevCount !== 0) {
                playNotificationSound();
            }
            sessionStorage.setItem('prevNotificationCount', unreadCounter.toString());

        }, (error) => {
            console.error('❌ Error listening to notifications:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
        } catch (error) {
            console.log('🔇 Audio notification not available');
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true,
                readAt: new Date()
            });
            console.log('👁️ Notification marked as read:', notificationId);
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter(n => !n.read);
            const updatePromises = unreadNotifications.map(notification =>
                updateDoc(doc(db, 'notifications', notification.id), {
                    read: true,
                    readAt: new Date()
                })
            );

            await Promise.all(updatePromises);
            console.log('👁️ All notifications marked as read');
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now - date;

            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

            return date.toLocaleDateString('en-MY', {
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return '';
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'offer': return '💰';
            case 'offer_accepted': return '✅';
            case 'offer_rejected': return '❌';
            case 'offer_countered': return '🔄';
            default: return '🔔';
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Handle different notification types
        if (notification.type?.includes('offer') && notification.productId) {
            window.location.href = `/product/${notification.productId}`;
        } else if (notification.orderId) {
            window.location.href = `/order/${notification.orderId}`;
        }

        setShowDropdown(false);
    };

    if (!user) return null;

    return (
        <div className="notification-system">
            <button
                className={`notification-bell ${showDropdown ? 'active' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
                title={`${unreadCount} unread notifications`}
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div className="notification-backdrop" onClick={() => setShowDropdown(false)} />
                    <div className="notification-dropdown">
                        <div className="notification-header">
                            <h3>🔔 Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    className="mark-all-read"
                                    onClick={markAllAsRead}
                                    title="Mark all as read"
                                >
                                    ✓ Mark all read
                                </button>
                            )}
                        </div>

                        <div className="notifications-list">
                            {loading ? (
                                <div className="notification-loading">
                                    <div className="spinner-small"></div>
                                    <p>Loading notifications...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="no-notifications">
                                    <span className="empty-icon">🔔</span>
                                    <h4>No notifications yet</h4>
                                    <p>You'll see offer updates and messages here</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="notification-icon">
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        <div className="notification-content">
                                            <div className="notification-title">
                                                {notification.title || 'New Notification'}
                                            </div>
                                            <div className="notification-body">
                                                {notification.body || notification.message}
                                            </div>
                                            <div className="notification-time">
                                                {formatTime(notification.timestamp)}
                                            </div>
                                        </div>

                                        {!notification.read && (
                                            <div className="unread-indicator"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="notification-footer">
                                <button
                                    className="view-all-btn"
                                    onClick={() => {
                                        setShowDropdown(false);
                                        // You can implement a full notifications page later
                                        console.log('View all notifications');
                                    }}
                                >
                                    📋 View All
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationSystem;
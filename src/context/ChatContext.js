// src/context/ChatContext.js - CORRECT VERSION with proper exports
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ChatContext = createContext();

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        return {
            conversations: [],
            unreadCount: 0,
            loading: false,
            chatSidebarOpen: false,
            toggleChatSidebar: () => console.log('Chat not initialized'),
            openChatSidebar: () => console.log('Chat not initialized'),
            closeChatSidebar: () => console.log('Chat not initialized'),
        };
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const [conversations, setConversations] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);

    // Monitor auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
            console.log('🔐 Chat Auth state changed:', authUser?.email || 'No user');
            setUser(authUser);

            if (!authUser) {
                setConversations([]);
                setUnreadCount(0);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    // Set up chat listeners when user changes
    useEffect(() => {
        if (!user?.uid) {
            console.log('💬 No user - clearing chat state');
            setConversations([]);
            setUnreadCount(0);
            return;
        }

        console.log('💬 Setting up chat for user:', user.uid);
        return setupChatListeners();
    }, [user?.uid]);

    const setupChatListeners = useCallback(() => {
        if (!user?.uid) return;

        setLoading(true);
        console.log('🔍 Setting up real-time chat listeners...');

        try {
            // Query orders where user is buyer OR seller
            const ordersQuery = query(
                collection(db, 'orders'),
                or(
                    where('buyerId', '==', user.uid),
                    where('sellerId', '==', user.uid)
                )
            );

            const unsubscribe = onSnapshot(
                ordersQuery,
                (snapshot) => {
                    console.log('📦 Orders snapshot received:', snapshot.size, 'orders');
                    processOrdersSnapshot(snapshot);
                },
                (error) => {
                    console.error('❌ Error in orders listener:', error);
                    setLoading(false);
                }
            );

            return unsubscribe;
        } catch (error) {
            console.error('❌ Error setting up chat listeners:', error);
            setLoading(false);
        }
    }, [user?.uid]);

    const processOrdersSnapshot = useCallback((snapshot) => {
        if (!user?.uid) return;

        const processedConversations = [];
        let totalUnreadCount = 0;

        snapshot.forEach((doc) => {
            const orderData = { id: doc.id, ...doc.data() };

            // Skip orders without messages
            if (!orderData.messages || orderData.messages.length === 0) {
                return;
            }

            // Determine user role in this order
            const isUserBuyer = orderData.buyerId === user.uid;
            const isUserSeller = orderData.sellerId === user.uid;

            if (!isUserBuyer && !isUserSeller) {
                return; // User not involved in this order
            }

            const userRole = isUserBuyer ? 'buyer' : 'seller';
            console.log(`📋 Processing order ${orderData.id.slice(-8)} - User is ${userRole}`);

            // Get other party information
            const otherParty = isUserBuyer ? {
                id: orderData.sellerId,
                name: orderData.sellerName,
                email: orderData.sellerEmail,
                role: 'seller'
            } : {
                id: orderData.buyerId,
                name: orderData.buyerName,
                email: orderData.buyerEmail,
                role: 'buyer'
            };

            // Count unread messages (messages from others that are unread)
            const unreadMessages = orderData.messages.filter(msg => {
                const isFromOther = msg.senderId !== user.uid;
                const isNotRead = msg.read !== true;
                return isFromOther && isNotRead;
            });

            console.log(`   📨 Messages: ${orderData.messages.length} total, ${unreadMessages.length} unread`);

            const lastMessage = orderData.messages[orderData.messages.length - 1];

            const conversation = {
                orderId: orderData.id,
                orderNumber: orderData.id.slice(-8),
                userRole,
                otherParty,
                order: orderData,
                messages: orderData.messages,
                unreadCount: unreadMessages.length,
                lastMessage,
                lastUpdated: orderData.lastUpdated || orderData.createdAt,
                status: orderData.status,
                paymentMethod: orderData.paymentMethod,
                totalAmount: orderData.totalAmount
            };

            processedConversations.push(conversation);
            totalUnreadCount += unreadMessages.length;
        });

        // Sort by last activity
        processedConversations.sort((a, b) => {
            const aTime = a.lastUpdated?.toDate?.() || new Date(a.lastUpdated || 0);
            const bTime = b.lastUpdated?.toDate?.() || new Date(b.lastUpdated || 0);
            return bTime - aTime;
        });

        console.log('🎯 FINAL RESULTS:');
        console.log(`   💬 ${processedConversations.length} conversations`);
        console.log(`   🔔 ${totalUnreadCount} total unread messages`);

        // Update state
        setConversations(processedConversations);
        setUnreadCount(totalUnreadCount);
        setLoading(false);

        // Play notification sound if unread count increased
        const prevCount = parseInt(sessionStorage.getItem('prevUnreadCount') || '0');
        if (totalUnreadCount > prevCount && prevCount !== 0) {
            console.log('🔔 New message notification!');
            playNotificationSound();
        }
        sessionStorage.setItem('prevUnreadCount', totalUnreadCount.toString());

    }, [user?.uid]);

    const playNotificationSound = () => {
        try {
            // Create notification beep
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch (error) {
            console.log('🔇 Audio notification not available');
        }
    };

    const toggleChatSidebar = () => {
        console.log('💬 Toggling chat sidebar, unread count:', unreadCount);
        setChatSidebarOpen(!chatSidebarOpen);
    };

    const openChatSidebar = () => {
        setChatSidebarOpen(true);
    };

    const closeChatSidebar = () => {
        setChatSidebarOpen(false);
    };

    const value = {
        conversations,
        unreadCount,
        loading,
        chatSidebarOpen,
        toggleChatSidebar,
        openChatSidebar,
        closeChatSidebar,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
// src/components/Pages/Orders.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import './Orders.css';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, completed, cancelled
    const navigate = useNavigate();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            console.log('❌ No user found, redirecting to login');
            navigate('/login');
            return;
        }

        console.log('👤 Current user:', user.uid, user.email);
        fetchOrders();
    }, [user, navigate]);

    const fetchOrders = async () => {
        if (!user) {
            setError('Please login to view orders');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            console.log('🔍 Fetching orders for buyer:', user.uid);

            // SIMPLE QUERY - Only where clause, NO orderBy (no index required)
            const q = query(
                collection(db, 'orders'),
                where('buyerId', '==', user.uid)
            );

            console.log('📝 Query created for buyerId:', user.uid);

            // Use onSnapshot for real-time updates
            const unsubscribe = onSnapshot(q,
                (querySnapshot) => {
                    console.log('📦 Query snapshot received, size:', querySnapshot.size);

                    const ordersData = [];
                    querySnapshot.forEach((doc) => {
                        const orderData = {
                            id: doc.id,
                            ...doc.data()
                        };
                        console.log('📄 Order found:', orderData);
                        ordersData.push(orderData);
                    });

                    // Sort in JavaScript - much more flexible!
                    ordersData.sort((a, b) => {
                        try {
                            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                            return bDate - aDate; // Newest first
                        } catch (error) {
                            console.error('Date sorting error:', error);
                            return 0;
                        }
                    });

                    console.log('✅ Total orders found and sorted:', ordersData.length);
                    setOrders(ordersData);
                    setLoading(false);
                },
                (error) => {
                    console.error('❌ Error fetching orders:', error);
                    setError('Failed to fetch orders: ' + error.message);
                    setLoading(false);
                }
            );

            // Cleanup function
            return () => {
                console.log('🧹 Cleaning up orders listener');
                unsubscribe();
            };

        } catch (error) {
            console.error('❌ Error setting up orders query:', error);
            setError('Failed to load orders: ' + error.message);
            setLoading(false);
        }
    };

    // Alternative fetch method using getDocs (for debugging)
    const fetchOrdersAlternative = async () => {
        if (!user) return;

        try {
            setLoading(true);
            console.log('🔍 Alternative fetch for user:', user.uid);

            // Simple query - just where clause
            const q = query(
                collection(db, 'orders'),
                where('buyerId', '==', user.uid)
            );

            const querySnapshot = await getDocs(q);
            console.log('📦 User orders found:', querySnapshot.size);

            const ordersData = [];
            querySnapshot.forEach((doc) => {
                ordersData.push({ id: doc.id, ...doc.data() });
            });

            // Sort in JavaScript
            ordersData.sort((a, b) => {
                try {
                    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return bDate - aDate;
                } catch (error) {
                    return 0;
                }
            });

            setOrders(ordersData);
            setLoading(false);

        } catch (error) {
            console.error('❌ Alternative fetch error:', error);
            setError('Failed to load orders: ' + error.message);
            setLoading(false);
        }
    };

    // Debug function to check all orders
    const debugAllOrders = async () => {
        try {
            console.log('🐛 DEBUG: Fetching ALL orders to check data...');

            // Get all orders without any filters
            const allOrdersSnapshot = await getDocs(collection(db, 'orders'));
            console.log('📦 Total orders in database:', allOrdersSnapshot.size);

            const allOrders = [];
            allOrdersSnapshot.forEach((doc) => {
                const orderData = { id: doc.id, ...doc.data() };
                allOrders.push(orderData);
                console.log('🔍 Order:', {
                    id: doc.id,
                    buyerId: orderData.buyerId,
                    sellerId: orderData.sellerId,
                    buyerEmail: orderData.buyerEmail,
                    sellerEmail: orderData.sellerEmail,
                    status: orderData.status,
                    paymentMethod: orderData.paymentMethod,
                    createdAt: orderData.createdAt?.toDate ? orderData.createdAt.toDate().toISOString() : orderData.createdAt
                });
            });

            console.log('📊 Summary:', {
                totalOrders: allOrders.length,
                currentUserId: user?.uid,
                currentUserEmail: user?.email,
                ordersAsBuyer: allOrders.filter(o => o.buyerId === user?.uid).length,
                ordersAsSeller: allOrders.filter(o => o.sellerId === user?.uid).length,
                orderStatuses: [...new Set(allOrders.map(o => o.status))],
                paymentMethods: [...new Set(allOrders.map(o => o.paymentMethod))]
            });

            return allOrders;

        } catch (error) {
            console.error('❌ Debug error:', error);
            return [];
        }
    };

    const formatCurrency = (amount) => {
        return `RM ${parseFloat(amount).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';

        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
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

    const getPaymentMethodIcon = (method) => {
        return method === 'qr' ? '💳' : '🤝';
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        if (filter === 'pending') return order.status?.includes('pending');
        if (filter === 'completed') return order.status === 'completed';
        if (filter === 'cancelled') return order.status === 'cancelled';
        return true;
    });

    const handleOrderClick = (orderId) => {
        // Navigate to order details or chat
        navigate(`/order/${orderId}`);
    };

    if (!user) {
        return (
            <div className="orders-container">
                <div className="no-user">
                    <h2>🔐 Please login to view your orders</h2>
                    <button onClick={() => navigate('/login')} className="login-btn">
                        Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-container">
            {/* <div className="orders-header">
                <h1>📦 My Orders</h1>
                <div className="debug-info">
                    <p><strong>User:</strong> {user.email} ({user.uid})</p>
                    <button onClick={fetchOrdersAlternative} className="debug-btn">
                        🔄 Debug Fetch
                    </button>
                    <button onClick={debugAllOrders} className="debug-btn">
                        🐛 Debug All Orders
                    </button>
                </div>
            </div> */}

            {/* Filter Tabs */}
            <div className="order-filters">
                <button
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    All Orders ({orders.length})
                </button>
                <button
                    className={filter === 'pending' ? 'active' : ''}
                    onClick={() => setFilter('pending')}
                >
                    Pending ({orders.filter(o => o.status?.includes('pending')).length})
                </button>
                <button
                    className={filter === 'completed' ? 'active' : ''}
                    onClick={() => setFilter('completed')}
                >
                    Completed ({orders.filter(o => o.status === 'completed').length})
                </button>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="loading-section">
                    <div className="spinner"></div>
                    <p>Loading your orders...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="error-section">
                    <h3>❌ Error</h3>
                    <p>{error}</p>
                    <button onClick={fetchOrders} className="retry-btn">
                        🔄 Try Again
                    </button>
                </div>
            )}

            {/* Orders List */}
            {!loading && !error && (
                <div className="orders-content">
                    {filteredOrders.length === 0 ? (
                        <div className="no-orders">
                            <h3>📭 No orders found</h3>
                            {filter === 'all' ? (
                                <div>
                                    <p>You haven't placed any orders yet.</p>
                                    <button
                                        onClick={() => navigate('/marketplace')}
                                        className="shop-now-btn"
                                    >
                                        🛍️ Start Shopping
                                    </button>
                                </div>
                            ) : (
                                <p>No orders found for the selected filter.</p>
                            )}
                        </div>
                    ) : (
                        <div className="orders-list">
                            {filteredOrders.map(order => (
                                <div
                                    key={order.id}
                                    className="order-card"
                                    onClick={() => handleOrderClick(order.id)}
                                >
                                    <div className="order-header">
                                        <div className="order-info">
                                            <h3>Order #{order.id.slice(-8)}</h3>
                                            <p className="order-date">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <div className="order-status">
                                            <span
                                                className="status-badge"
                                                style={{ backgroundColor: getStatusColor(order.status) }}
                                            >
                                                {order.status?.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="order-details">
                                        <div className="seller-info">
                                            <strong>🏪 Seller:</strong> {order.sellerName || order.sellerEmail}
                                        </div>

                                        <div className="payment-method">
                                            <strong>Payment:</strong>
                                            <span className="payment-badge">
                                                {getPaymentMethodIcon(order.paymentMethod)}
                                                {order.paymentMethod === 'qr' ? 'QR Payment' : 'Meetup'}
                                            </span>
                                        </div>

                                        <div className="order-items">
                                            <strong>Items ({order.items?.length || 0}):</strong>
                                            <div className="items-preview">
                                                {order.items?.slice(0, 2).map((item, index) => (
                                                    <span key={index} className="item-name">
                                                        {item.name} x{item.quantity}
                                                    </span>
                                                ))}
                                                {order.items?.length > 2 && (
                                                    <span className="more-items">
                                                        +{order.items.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="order-footer">
                                        <div className="order-total">
                                            <strong>{formatCurrency(order.totalAmount)}</strong>
                                        </div>
                                        <div className="order-actions">
                                            <button className="view-order-btn">
                                                💬 View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Debug Information
            <div className="debug-section" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <h4>🐛 Debug Information</h4>
                <p><strong>User ID:</strong> {user?.uid}</p>
                <p><strong>User Email:</strong> {user?.email}</p>
                <p><strong>Orders Found:</strong> {orders.length}</p>
                <p><strong>Filter Applied:</strong> {filter}</p>
                <p><strong>Filtered Orders:</strong> {filteredOrders.length}</p>
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {error || 'None'}</p>

                {orders.length > 0 && (
                    <details style={{ marginTop: '10px' }}>
                        <summary>📋 Orders Data (Click to expand)</summary>
                        <pre style={{ fontSize: '12px', background: 'white', padding: '10px', overflow: 'auto' }}>
                            {JSON.stringify(orders, null, 2)}
                        </pre>
                    </details>
                )}
            </div> */}
        </div>
    );
};

export default Orders;
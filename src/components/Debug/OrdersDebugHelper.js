// // src/components/Debug/OrdersDebugHelper.js
// // ADD THIS TEMPORARILY TO DEBUG ORDER ISSUES
// import React, { useState, useEffect } from 'react';
// import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
// import { db, auth } from '../../firebase';

// const OrdersDebugHelper = () => {
//     const [allOrders, setAllOrders] = useState([]);
//     const [userOrders, setUserOrders] = useState([]);
//     const [sellerOrders, setSellerOrders] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const user = auth.currentUser;

//     const fetchAllOrders = async () => {
//         try {
//             setLoading(true);
//             console.log('🔍 Debug: Fetching all orders from Firestore...');

//             // Get all orders (limit to last 20 for performance)
//             const q = query(
//                 collection(db, 'orders'),
//                 orderBy('createdAt', 'desc'),
//                 limit(20)
//             );

//             const querySnapshot = await getDocs(q);
//             const orders = [];

//             querySnapshot.forEach((doc) => {
//                 const orderData = { id: doc.id, ...doc.data() };
//                 orders.push(orderData);
//             });

//             console.log('📦 Debug: All orders found:', orders);
//             setAllOrders(orders);

//             if (user) {
//                 // Filter orders for current user as buyer
//                 const buyerOrders = orders.filter(order => order.buyerId === user.uid);
//                 console.log('🛒 Debug: Buyer orders for user:', buyerOrders);
//                 setUserOrders(buyerOrders);

//                 // Filter orders for current user as seller
//                 const sellerOrdersFiltered = orders.filter(order => order.sellerId === user.uid);
//                 console.log('🏪 Debug: Seller orders for user:', sellerOrdersFiltered);
//                 setSellerOrders(sellerOrdersFiltered);
//             }

//             setLoading(false);
//         } catch (error) {
//             console.error('❌ Debug: Error fetching orders:', error);
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         if (user) {
//             fetchAllOrders();
//         }
//     }, [user]);

//     const formatDate = (date) => {
//         if (!date) return 'N/A';
//         const d = date.toDate ? date.toDate() : new Date(date);
//         return d.toLocaleString('en-MY');
//     };

//     if (!user) {
//         return (
//             <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '20px', borderRadius: '8px' }}>
//                 <h3>🔍 Orders Debug Helper</h3>
//                 <p>Please login to use the debug helper</p>
//             </div>
//         );
//     }

//     return (
//         <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '20px', borderRadius: '8px' }}>
//             <h3>🔍 Orders Debug Helper</h3>
//             <p><strong>Current User:</strong> {user.email} ({user.uid})</p>

//             <button
//                 onClick={fetchAllOrders}
//                 disabled={loading}
//                 style={{
//                     padding: '10px 20px',
//                     backgroundColor: '#007bff',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px',
//                     cursor: 'pointer',
//                     marginBottom: '20px'
//                 }}
//             >
//                 {loading ? 'Loading...' : '🔄 Refresh Orders'}
//             </button>

//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
//                 {/* All Orders */}
//                 <div>
//                     <h4>📦 All Recent Orders ({allOrders.length})</h4>
//                     <div style={{ maxHeight: '300px', overflow: 'auto', backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
//                         {allOrders.length === 0 ? (
//                             <p>No orders found in database</p>
//                         ) : (
//                             allOrders.map(order => (
//                                 <div key={order.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
//                                     <strong>Order #{order.id.slice(-8)}</strong><br />
//                                     <small>Buyer: {order.buyerEmail}</small><br />
//                                     <small>Seller: {order.sellerEmail}</small><br />
//                                     <small>Method: {order.paymentMethod}</small><br />
//                                     <small>Status: {order.status}</small><br />
//                                     <small>Created: {formatDate(order.createdAt)}</small><br />
//                                     <small>Total: RM {order.totalAmount}</small>
//                                 </div>
//                             ))
//                         )}
//                     </div>
//                 </div>

//                 {/* User as Buyer */}
//                 <div>
//                     <h4>🛒 My Purchases ({userOrders.length})</h4>
//                     <div style={{ maxHeight: '300px', overflow: 'auto', backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
//                         {userOrders.length === 0 ? (
//                             <p>No purchases found</p>
//                         ) : (
//                             userOrders.map(order => (
//                                 <div key={order.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
//                                     <strong>Order #{order.id.slice(-8)}</strong><br />
//                                     <small>Seller: {order.sellerEmail}</small><br />
//                                     <small>Method: {order.paymentMethod}</small><br />
//                                     <small>Status: {order.status}</small><br />
//                                     <small>Items: {order.items?.length || 0}</small><br />
//                                     <small>Total: RM {order.totalAmount}</small>
//                                 </div>
//                             ))
//                         )}
//                     </div>
//                 </div>

//                 {/* User as Seller */}
//                 <div>
//                     <h4>🏪 My Sales ({sellerOrders.length})</h4>
//                     <div style={{ maxHeight: '300px', overflow: 'auto', backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
//                         {sellerOrders.length === 0 ? (
//                             <p>No sales found</p>
//                         ) : (
//                             sellerOrders.map(order => (
//                                 <div key={order.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
//                                     <strong>Order #{order.id.slice(-8)}</strong><br />
//                                     <small>Buyer: {order.buyerEmail}</small><br />
//                                     <small>Method: {order.paymentMethod}</small><br />
//                                     <small>Status: {order.status}</small><br />
//                                     <small>Items: {order.items?.length || 0}</small><br />
//                                     <small>Total: RM {order.totalAmount}</small>
//                                 </div>
//                             ))
//                         )}
//                     </div>
//                 </div>
//             </div>

//             <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
//                 <h4>🐛 Debug Information</h4>
//                 <p><strong>Firestore Collection:</strong> 'orders'</p>
//                 <p><strong>Current User ID:</strong> {user.uid}</p>
//                 <p><strong>Current User Email:</strong> {user.email}</p>
//                 <p><strong>Total Orders in DB:</strong> {allOrders.length}</p>
//                 <p><strong>Orders as Buyer:</strong> {userOrders.length}</p>
//                 <p><strong>Orders as Seller:</strong> {sellerOrders.length}</p>

//                 {allOrders.length === 0 && (
//                     <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
//                         <strong>⚠️ No orders found!</strong><br />
//                         This means either:
//                         <ul>
//                             <li>No orders have been created yet</li>
//                             <li>Orders are being created in a different collection</li>
//                             <li>There's an issue with order creation</li>
//                         </ul>
//                         Try making a test purchase to see if orders are created.
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default OrdersDebugHelper;
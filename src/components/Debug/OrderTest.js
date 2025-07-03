// // src/components/Debug/OrderTest.js
// // Temporary component to test order creation directly
// import React, { useState } from 'react';
// import { collection, addDoc } from 'firebase/firestore';
// import { db, auth } from '../../firebase';

// const OrderTest = () => {
//     const [loading, setLoading] = useState(false);
//     const [result, setResult] = useState('');

//     const createTestOrder = async () => {
//         try {
//             setLoading(true);
//             setResult('Creating test order...');

//             const testOrderData = {
//                 buyerId: auth.currentUser?.uid,
//                 buyerEmail: auth.currentUser?.email,
//                 buyerName: auth.currentUser?.displayName || auth.currentUser?.email,
//                 sellerId: 'test_seller_id',
//                 sellerEmail: 'seller@test.com',
//                 sellerName: 'Test Seller',
//                 items: [
//                     {
//                         productId: 'test_product',
//                         name: 'Test Product',
//                         price: 10.00,
//                         quantity: 1,
//                         image: 'https://via.placeholder.com/150',
//                         total: 10.00
//                     }
//                 ],
//                 totalAmount: 10.00,
//                 paymentMethod: 'qr',
//                 status: 'pending_payment',
//                 createdAt: new Date(),
//                 lastUpdated: new Date(),
//                 messages: []
//             };

//             console.log('Creating test order with data:', testOrderData);

//             const orderRef = await addDoc(collection(db, 'orders'), testOrderData);

//             setResult(`✅ Test order created successfully with ID: ${orderRef.id}`);
//             setLoading(false);
//         } catch (error) {
//             console.error('Error creating test order:', error);
//             setResult(`❌ Error: ${error.message}`);
//             setLoading(false);
//         }
//     };

//     return (
//         <div style={{
//             padding: '20px',
//             border: '2px solid blue',
//             margin: '20px',
//             backgroundColor: '#f0f8ff'
//         }}>
//             <h3>🧪 Order Creation Test</h3>

//             <div style={{ marginBottom: '15px' }}>
//                 <strong>Current User:</strong> {auth.currentUser?.email || 'Not logged in'}
//             </div>

//             <button
//                 onClick={createTestOrder}
//                 disabled={loading || !auth.currentUser}
//                 style={{
//                     padding: '10px 20px',
//                     fontSize: '16px',
//                     backgroundColor: loading ? '#ccc' : '#007bff',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '5px',
//                     cursor: loading ? 'not-allowed' : 'pointer'
//                 }}
//             >
//                 {loading ? 'Creating...' : 'Create Test Order'}
//             </button>

//             {result && (
//                 <div style={{
//                     marginTop: '15px',
//                     padding: '10px',
//                     backgroundColor: result.includes('✅') ? '#d4edda' : '#f8d7da',
//                     border: `1px solid ${result.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
//                     borderRadius: '5px'
//                 }}>
//                     {result}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default OrderTest;
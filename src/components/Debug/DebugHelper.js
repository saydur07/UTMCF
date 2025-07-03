// // src/components/Debug/DebugHelper.js
// // This is a temporary component to help debug the QR and order issues
// import React, { useState, useEffect } from 'react';
// import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
// import { db, auth } from '../../firebase';

// const DebugHelper = () => {
//     const [productData, setProductData] = useState(null);
//     const [orderData, setOrderData] = useState([]);
//     const [selectedProductId, setSelectedProductId] = useState('');
//     const user = auth.currentUser;

//     const checkProduct = async () => {
//         if (!selectedProductId) return;

//         try {
//             const productDoc = await getDoc(doc(db, 'products', selectedProductId));
//             if (productDoc.exists()) {
//                 const data = productDoc.data();
//                 setProductData(data);
//                 console.log('Product data:', data);
//             } else {
//                 setProductData({ error: 'Product not found' });
//             }
//         } catch (error) {
//             setProductData({ error: error.message });
//         }
//     };

//     const checkOrders = async () => {
//         try {
//             const ordersSnapshot = await getDocs(collection(db, 'orders'));
//             const orders = [];
//             ordersSnapshot.forEach((doc) => {
//                 orders.push({ id: doc.id, ...doc.data() });
//             });
//             setOrderData(orders);
//             console.log('All orders:', orders);
//         } catch (error) {
//             console.error('Error fetching orders:', error);
//         }
//     };

//     return (
//         <div style={{ padding: '20px', border: '2px solid red', margin: '20px', backgroundColor: '#fff' }}>
//             <h2>🔧 Debug Helper</h2>

//             <div style={{ marginBottom: '20px' }}>
//                 <h3>Check Product QR Codes</h3>
//                 <input
//                     type="text"
//                     placeholder="Enter Product ID"
//                     value={selectedProductId}
//                     onChange={(e) => setSelectedProductId(e.target.value)}
//                     style={{ padding: '10px', marginRight: '10px', width: '300px' }}
//                 />
//                 <button onClick={checkProduct} style={{ padding: '10px' }}>
//                     Check Product
//                 </button>

//                 {productData && (
//                     <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
//                         <strong>Product Data:</strong>
//                         <pre>{JSON.stringify(productData, null, 2)}</pre>
//                     </div>
//                 )}
//             </div>

//             <div style={{ marginBottom: '20px' }}>
//                 <h3>Check All Orders</h3>
//                 <button onClick={checkOrders} style={{ padding: '10px' }}>
//                     Fetch All Orders
//                 </button>

//                 <div style={{ marginTop: '10px' }}>
//                     <strong>Orders Count: {orderData.length}</strong>
//                     {orderData.length > 0 && (
//                         <div style={{ maxHeight: '300px', overflow: 'auto', backgroundColor: '#f0f0f0', padding: '10px' }}>
//                             <pre>{JSON.stringify(orderData, null, 2)}</pre>
//                         </div>
//                     )}
//                 </div>
//             </div>

//             <div style={{ marginBottom: '20px' }}>
//                 <h3>Current User Info</h3>
//                 <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
//                     <strong>User ID:</strong> {user?.uid}<br />
//                     <strong>Email:</strong> {user?.email}<br />
//                     <strong>Display Name:</strong> {user?.displayName}
//                 </div>
//             </div>

//             <div style={{ backgroundColor: '#ffe6e6', padding: '15px', borderRadius: '5px' }}>
//                 <strong>Instructions:</strong>
//                 <ol>
//                     <li>First, create a product with QR codes as a seller</li>
//                     <li>Copy the product ID from Firestore console or network tab</li>
//                     <li>Paste it above and click "Check Product" to verify QR codes are saved</li>
//                     <li>Then try to make an order as a buyer</li>
//                     <li>Click "Fetch All Orders" to see if orders are being created</li>
//                 </ol>
//             </div>
//         </div>
//     );
// };

// export default DebugHelper;
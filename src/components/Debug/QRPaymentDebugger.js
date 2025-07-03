// // src/components/Debug/QRPaymentDebugger.js
// import React, { useState } from 'react';
// import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
// import { db, auth } from '../../firebase';

// const QRPaymentDebugger = () => {
//     const [debugResults, setDebugResults] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [productId, setProductId] = useState('');

//     const runCompleteQRDebug = async () => {
//         setLoading(true);
//         const results = {
//             currentUser: auth.currentUser,
//             userProducts: [],
//             allProducts: [],
//             selectedProduct: null,
//             qrCodesFound: [],
//             errors: []
//         };

//         try {
//             console.log('🔍 Starting QR Payment Debug...');

//             // 1. Get current user
//             if (!auth.currentUser) {
//                 results.errors.push('❌ No user logged in');
//                 setDebugResults(results);
//                 setLoading(false);
//                 return;
//             }

//             // 2. Get all products by current user
//             try {
//                 const userProductsQuery = query(
//                     collection(db, 'products'),
//                     where('seller.id', '==', auth.currentUser.uid)
//                 );
//                 const userProductsSnapshot = await getDocs(userProductsQuery);

//                 userProductsSnapshot.forEach((doc) => {
//                     const productData = { id: doc.id, ...doc.data() };
//                     results.userProducts.push(productData);
//                     console.log('User product found:', productData);
//                 });

//                 console.log(`📦 Found ${results.userProducts.length} products by current user`);
//             } catch (error) {
//                 results.errors.push(`❌ Error fetching user products: ${error.message}`);
//             }

//             // 3. Get all products in database
//             try {
//                 const allProductsSnapshot = await getDocs(collection(db, 'products'));
//                 allProductsSnapshot.forEach((doc) => {
//                     const productData = { id: doc.id, ...doc.data() };
//                     results.allProducts.push(productData);
//                 });
//                 console.log(`📦 Found ${results.allProducts.length} total products in database`);
//             } catch (error) {
//                 results.errors.push(`❌ Error fetching all products: ${error.message}`);
//             }

//             // 4. If productId is provided, check specific product
//             if (productId) {
//                 try {
//                     const productDoc = await getDoc(doc(db, 'products', productId));
//                     if (productDoc.exists()) {
//                         results.selectedProduct = { id: productDoc.id, ...productDoc.data() };
//                         console.log('Selected product:', results.selectedProduct);

//                         if (results.selectedProduct.qrCodes) {
//                             results.qrCodesFound = results.selectedProduct.qrCodes;
//                             console.log('QR codes found:', results.qrCodesFound);
//                         } else {
//                             results.errors.push('❌ No qrCodes field found in selected product');
//                         }
//                     } else {
//                         results.errors.push('❌ Selected product does not exist');
//                     }
//                 } catch (error) {
//                     results.errors.push(`❌ Error fetching selected product: ${error.message}`);
//                 }
//             }

//             setDebugResults(results);
//             setLoading(false);

//         } catch (error) {
//             results.errors.push(`❌ General debug error: ${error.message}`);
//             setDebugResults(results);
//             setLoading(false);
//         }
//     };

//     const analyzeQRCodes = (product) => {
//         if (!product.qrCodes) {
//             return { status: '❌', message: 'No qrCodes field' };
//         }

//         if (!Array.isArray(product.qrCodes)) {
//             return { status: '❌', message: 'qrCodes is not an array' };
//         }

//         if (product.qrCodes.length === 0) {
//             return { status: '❌', message: 'qrCodes array is empty' };
//         }

//         const validQRs = product.qrCodes.filter(qr => qr.imageUrl);
//         if (validQRs.length === 0) {
//             return { status: '❌', message: 'No QR codes have imageUrl' };
//         }

//         return { status: '✅', message: `${validQRs.length} valid QR codes found` };
//     };

//     return (
//         <div style={{
//             padding: '20px',
//             border: '3px solid #dc3545',
//             margin: '20px',
//             backgroundColor: '#fff5f5',
//             borderRadius: '10px'
//         }}>
//             <h2>🔍 QR Payment System Debugger</h2>

//             <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
//                 <input
//                     type="text"
//                     placeholder="Enter Product ID to inspect (optional)"
//                     value={productId}
//                     onChange={(e) => setProductId(e.target.value)}
//                     style={{ padding: '10px', width: '300px', border: '1px solid #ddd', borderRadius: '5px' }}
//                 />
//                 <button
//                     onClick={runCompleteQRDebug}
//                     disabled={loading}
//                     style={{
//                         padding: '10px 20px',
//                         backgroundColor: '#dc3545',
//                         color: 'white',
//                         border: 'none',
//                         borderRadius: '5px',
//                         cursor: loading ? 'not-allowed' : 'pointer'
//                     }}
//                 >
//                     {loading ? '🔄 Debugging...' : '🔍 Run QR Debug'}
//                 </button>
//             </div>

//             {debugResults && (
//                 <div>
//                     {/* Current User */}
//                     <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
//                         <h3>👤 Current User</h3>
//                         {debugResults.currentUser ? (
//                             <div>
//                                 <strong>UID:</strong> {debugResults.currentUser.uid}<br />
//                                 <strong>Email:</strong> {debugResults.currentUser.email}
//                             </div>
//                         ) : (
//                             <div style={{ color: '#dc3545' }}>❌ No user logged in</div>
//                         )}
//                     </div>

//                     {/* Errors */}
//                     {debugResults.errors.length > 0 && (
//                         <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '5px' }}>
//                             <h3>⚠️ Errors</h3>
//                             {debugResults.errors.map((error, index) => (
//                                 <div key={index}>{error}</div>
//                             ))}
//                         </div>
//                     )}

//                     {/* Statistics */}
//                     <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
//                         <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '5px', textAlign: 'center' }}>
//                             <h4>📦 Your Products</h4>
//                             <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{debugResults.userProducts.length}</div>
//                         </div>
//                         <div style={{ padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px', textAlign: 'center' }}>
//                             <h4>🌐 Total Products</h4>
//                             <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{debugResults.allProducts.length}</div>
//                         </div>
//                         <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', textAlign: 'center' }}>
//                             <h4>💳 QR Codes Found</h4>
//                             <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{debugResults.qrCodesFound.length}</div>
//                         </div>
//                     </div>

//                     {/* Your Products Analysis */}
//                     <div style={{ marginBottom: '20px' }}>
//                         <h3>📦 Your Products Analysis</h3>
//                         <div style={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '5px', overflow: 'hidden' }}>
//                             {debugResults.userProducts.length === 0 ? (
//                                 <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
//                                     No products found. Create a product first!
//                                 </div>
//                             ) : (
//                                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                                     <thead style={{ backgroundColor: '#f8f9fa' }}>
//                                         <tr>
//                                             <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Product ID</th>
//                                             <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
//                                             <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>QR Status</th>
//                                             <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>QR Count</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {debugResults.userProducts.map((product, index) => {
//                                             const qrAnalysis = analyzeQRCodes(product);
//                                             return (
//                                                 <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
//                                                     <td style={{ padding: '12px', fontFamily: 'monospace' }}>{product.id}</td>
//                                                     <td style={{ padding: '12px' }}>{product.name}</td>
//                                                     <td style={{ padding: '12px' }}>
//                                                         <span style={{ color: qrAnalysis.status === '✅' ? '#28a745' : '#dc3545' }}>
//                                                             {qrAnalysis.status} {qrAnalysis.message}
//                                                         </span>
//                                                     </td>
//                                                     <td style={{ padding: '12px' }}>{product.qrCodes?.length || 0}</td>
//                                                 </tr>
//                                             );
//                                         })}
//                                     </tbody>
//                                 </table>
//                             )}
//                         </div>
//                     </div>

//                     {/* Selected Product Details */}
//                     {debugResults.selectedProduct && (
//                         <div style={{ marginBottom: '20px' }}>
//                             <h3>🔍 Selected Product Details</h3>
//                             <div style={{ backgroundColor: 'white', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
//                                 <strong>Product ID:</strong> {debugResults.selectedProduct.id}<br />
//                                 <strong>Name:</strong> {debugResults.selectedProduct.name}<br />
//                                 <strong>Seller ID:</strong> {debugResults.selectedProduct.seller?.id}<br />
//                                 <strong>QR Codes:</strong>
//                                 <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', marginTop: '10px', borderRadius: '3px', overflow: 'auto' }}>
//                                     {JSON.stringify(debugResults.selectedProduct.qrCodes, null, 2)}
//                                 </pre>
//                             </div>
//                         </div>
//                     )}

//                     {/* Quick Actions */}
//                     <div style={{ backgroundColor: '#cce5ff', padding: '15px', borderRadius: '5px' }}>
//                         <h4>🔧 Quick Actions</h4>
//                         <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
//                             <button
//                                 onClick={() => console.log('All user products:', debugResults.userProducts)}
//                                 style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
//                             >
//                                 🖥️ Log Products to Console
//                             </button>
//                             <button
//                                 onClick={() => {
//                                     const productsWithQR = debugResults.userProducts.filter(p => p.qrCodes?.length > 0);
//                                     console.log('Products with QR codes:', productsWithQR);
//                                 }}
//                                 style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
//                             >
//                                 💳 Log QR Products Only
//                             </button>
//                             <button
//                                 onClick={() => {
//                                     if (debugResults.userProducts.length > 0) {
//                                         navigator.clipboard.writeText(debugResults.userProducts[0].id);
//                                         alert('First product ID copied to clipboard!');
//                                     }
//                                 }}
//                                 style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
//                             >
//                                 📋 Copy First Product ID
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default QRPaymentDebugger;
// // src/components/Debug/ChatDebug.js - Temporary debug component
// import React from 'react';
// import { useChat } from '../../context/ChatContext';
// import { auth } from '../../firebase';

// const ChatDebug = () => {
//     const { conversations, unreadCount, loading } = useChat();
//     const user = auth.currentUser;

//     if (!user) return null;

//     return (

//         <div style={{
//             position: 'fixed',
//             bottom: '80px',
//             right: '20px',
//             background: 'white',
//             border: '1px solid #ccc',
//             borderRadius: '8px',
//             padding: '15px',
//             maxWidth: '300px',
//             fontSize: '12px',
//             zIndex: 9999,
//             boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
//         }}>
//             {user && process.env.NODE_ENV === 'development' && <ChatDebug />}
//             <h4 style={{ margin: '0 0 10px 0' }}>🐛 Chat Debug</h4>
//             <p><strong>User:</strong> {user.email}</p>
//             <p><strong>User ID:</strong> {user.uid}</p>
//             <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
//             <p><strong>Conversations:</strong> {conversations.length}</p>
//             <p><strong>Unread Count:</strong> {unreadCount}</p>

//             {conversations.length > 0 && (
//                 <details style={{ marginTop: '10px' }}>
//                     <summary>Conversations Details</summary>
//                     {conversations.map((conv, index) => (
//                         <div key={conv.orderId} style={{
//                             margin: '5px 0',
//                             padding: '5px',
//                             background: '#f9f9f9',
//                             borderRadius: '4px'
//                         }}>
//                             <strong>#{conv.orderNumber}</strong><br />
//                             <small>Role: {conv.userRole}</small><br />
//                             <small>Other: {conv.otherParty.name}</small><br />
//                             <small>Messages: {conv.messages.length}</small><br />
//                             <small>Unread: <span style={{ color: 'red', fontWeight: 'bold' }}>{conv.unreadCount}</span></small>
//                         </div>
//                     ))}
//                 </details>
//             )}
//         </div>
//     );
// };

// export default ChatDebug;
//src/components/StorageTest.js (temporary test file)
// import React from 'react';
// import { storage, auth } from '../firebase';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// const StorageTest = () => {
//     const testStorage = () => {
//         console.log('Testing Firebase Storage...');
//         console.log('Storage object:', storage);
//         console.log('Auth user:', auth.currentUser);

//         // Test creating a reference
//         try {
//             const testRef = ref(storage, 'test/test.txt');
//             console.log('Storage reference created:', testRef);
//             alert('Firebase Storage is properly configured!');
//         } catch (error) {
//             console.error('Storage test failed:', error);
//             alert('Firebase Storage error: ' + error.message);
//         }
//     };

//     return (
//         <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px' }}>
//             <h3>Firebase Storage Test</h3>
//             <button onClick={testStorage}>Test Storage Connection</button>
//             <p>Check browser console for detailed logs</p>
//         </div>
//     );
// };

// export default StorageTest;
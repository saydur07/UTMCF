// functions/index.js
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Note: In Firebase Functions, you don't need serviceAccountKey.json
// The admin SDK automatically uses the default credentials
admin.initializeApp();

const app = express();

// Middleware - Updated CORS for production
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:3001',
        'https://utmcf-2f326.web.app',
        'https://utmcf-2f326.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'UTMCF Admin API Server is running',
        timestamp: new Date().toISOString()
    });
});

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
    try {
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No admin token provided' });
        }

        const adminToken = authorization.split('Bearer ')[1];

        // Verify the token
        const decodedToken = await admin.auth().verifyIdToken(adminToken);

        // Check if user is admin in Firestore
        const adminRecord = await admin.firestore()
            .collection('admins')
            .doc(decodedToken.uid)
            .get();

        if (!adminRecord.exists || !adminRecord.data().isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        req.adminUser = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };

        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid admin token' });
    }
};

// API endpoint to delete user completely
app.delete('/users/:uid', verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const adminUser = req.adminUser;

        console.log(`🗑️ Admin ${adminUser.email} attempting to delete user: ${uid}`);

        let deletionResults = {
            authentication: false,
            firestore: false,
            relatedData: false
        };

        // Step 1: Get user info before deletion (for logging)
        let userInfo = { email: 'Unknown', displayName: 'Unknown' };
        try {
            const userRecord = await admin.auth().getUser(uid);
            userInfo.email = userRecord.email || 'No email';
            userInfo.displayName = userRecord.displayName || 'No name';
        } catch (error) {
            console.log('Could not fetch user info:', error.message);
        }

        // Step 2: Delete user from Firebase Authentication
        try {
            await admin.auth().deleteUser(uid);
            deletionResults.authentication = true;
            console.log('✅ User deleted from Firebase Authentication');
        } catch (authError) {
            console.error('❌ Firebase Auth deletion failed:', authError);
            // Continue with Firestore deletion even if Auth deletion fails
        }

        // Step 3: Delete user document from Firestore
        try {
            await admin.firestore().collection('users').doc(uid).delete();
            deletionResults.firestore = true;
            console.log('✅ User document deleted from Firestore');
        } catch (firestoreError) {
            console.error('❌ Firestore deletion failed:', firestoreError);
        }

        // Step 4: Delete related user data
        try {
            const batch = admin.firestore().batch();
            let batchOperations = 0;

            // Delete user's products
            const productsSnapshot = await admin.firestore()
                .collection('products')
                .where('sellerId', '==', uid)
                .get();

            productsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
                batchOperations++;
            });

            // Delete user's orders (as buyer)
            const buyerOrdersSnapshot = await admin.firestore()
                .collection('orders')
                .where('buyerId', '==', uid)
                .get();

            buyerOrdersSnapshot.forEach(doc => {
                batch.delete(doc.ref);
                batchOperations++;
            });

            // Delete user's orders (as seller)
            const sellerOrdersSnapshot = await admin.firestore()
                .collection('orders')
                .where('sellerId', '==', uid)
                .get();

            sellerOrdersSnapshot.forEach(doc => {
                batch.delete(doc.ref);
                batchOperations++;
            });

            // Commit the batch if there are operations
            if (batchOperations > 0) {
                await batch.commit();
                console.log(`✅ Deleted ${batchOperations} related documents`);
            }

            deletionResults.relatedData = true;
        } catch (relatedDataError) {
            console.error('❌ Related data deletion failed:', relatedDataError);
        }

        // Step 5: Log the deletion action
        try {
            await admin.firestore().collection('admin_logs').add({
                action: 'user_deletion',
                adminUid: adminUser.uid,
                adminEmail: adminUser.email,
                deletedUserUid: uid,
                deletedUserEmail: userInfo.email,
                deletedUserName: userInfo.displayName,
                deletionResults: deletionResults,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: deletionResults.authentication && deletionResults.firestore
            });
        } catch (logError) {
            console.error('❌ Failed to log deletion action:', logError);
        }

        // Step 6: Send response
        const overallSuccess = deletionResults.authentication && deletionResults.firestore;

        res.json({
            success: overallSuccess,
            message: overallSuccess
                ? 'User completely deleted from entire system'
                : 'Partial deletion completed',
            deletedUid: uid,
            userInfo: userInfo,
            deletionResults: deletionResults,
            timestamp: new Date().toISOString()
        });

        console.log(`🎉 User deletion completed for ${uid} by admin ${adminUser.email}`);

    } catch (error) {
        console.error('❌ Error during user deletion:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API endpoint to get all users (for admin dashboard)
app.get('/users', verifyAdmin, async (req, res) => {
    try {
        const usersSnapshot = await admin.firestore().collection('users').get();
        const users = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.role !== 'admin' && !userData.isAdmin) {
                users.push({
                    id: doc.id,
                    ...userData
                });
            }
        });

        res.json({
            success: true,
            users: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);

// firebase-admin-setup.js
// Run this script once to set up admin user and system collections

import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    addDoc
} from 'firebase/firestore';
import {
    getAuth,
    createUserWithEmailAndPassword
} from 'firebase/auth';

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
    // Your config here
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin setup function
const setupAdmin = async () => {
    try {
        console.log('Setting up admin user...');

        // 1. Create admin user account
        const adminEmail = 'admin@utmcf.edu.my';
        const adminPassword = 'asd123'; // Use a strong password

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            adminEmail,
            adminPassword
        );

        const adminUid = userCredential.user.uid;
        console.log('Admin user created with UID:', adminUid);

        // 2. Add admin document to 'admins' collection
        await setDoc(doc(db, 'admins', adminUid), {
            email: adminEmail,
            isAdmin: true,
            role: 'admin',
            permissions: [
                'view_all_users',
                'manage_system_maintenance',
                'view_seller_data',
                'system_control'
            ],
            createdAt: new Date(),
            createdBy: 'system',
            lastLogin: null,
            isActive: true
        });

        console.log('Admin document created in Firestore');

        // 3. Initialize system maintenance document
        await setDoc(doc(db, 'system', 'maintenance'), {
            isUnderMaintenance: false,
            maintenanceMessage: 'System is currently under maintenance. Please try again later.',
            scheduledStart: null,
            scheduledEnd: null,
            lastUpdated: new Date(),
            updatedBy: 'system',
            isScheduled: false
        });

        console.log('System maintenance document initialized');

        // 4. Create system configuration document
        await setDoc(doc(db, 'system', 'config'), {
            siteName: 'UTMCF Marketplace',
            version: '1.0.0',
            allowRegistration: true,
            maxFileUploadSize: 5242880, // 5MB
            supportEmail: 'support@utmcf.edu.my',
            lastUpdated: new Date()
        });

        console.log('System configuration initialized');

        console.log('\n✅ Admin setup completed successfully!');
        console.log('\nAdmin Credentials:');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('Access Key: UTMCF-ADMIN-2024-SECURE');
        console.log('\n⚠️  Please save these credentials securely and change the password after first login!');

    } catch (error) {
        console.error('Error setting up admin:', error);

        if (error.code === 'auth/email-already-in-use') {
            console.log('\n⚠️  Admin user already exists. Setting up documents only...');

            // If user exists, just setup the documents
            // You'll need to get the existing user's UID manually
            console.log('Please manually add the admin UID to complete setup');
        }
    }
};

// Firestore Security Rules (add these to your Firebase Console)
const securityRulesExample = `
// Firestore Security Rules for UTMCF Marketplace
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin collection - only admins can read/write
    match /admins/{adminId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // System collection - only admins can write, everyone can read maintenance status
    match /system/{document} {
      allow read: if true; // Everyone can check maintenance status
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users collection - users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Products collection - sellers can manage their products, everyone can read
    match /products/{productId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && 
        (resource.data.sellerId == request.auth.uid || 
         (exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true));
    }
    
    // Orders collection - users can read/write their own orders
    match /orders/{orderId} {
      allow read, write: if request.auth != null && 
        (resource.data.buyerId == request.auth.uid || 
         resource.data.sellerId == request.auth.uid);
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
`;

console.log('\n📋 Firestore Security Rules:');
console.log(securityRulesExample);

// Run the setup
setupAdmin();

export { setupAdmin };
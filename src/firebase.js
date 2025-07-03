// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBdsBemdLCPB1W8bkw-Jc_I9ITvQVK3daU",
    authDomain: "utmcf-2f326.firebaseapp.com",
    projectId: "utmcf-2f326",
    storageBucket: "utmcf-2f326.firebasestorage.app",
    messagingSenderId: "894529484823",
    appId: "1:894529484823:web:a9d6501e61daf5a605c452",
    measurementId: "G-ZWDGD11H55"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
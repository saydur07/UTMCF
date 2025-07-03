import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('🔐 Signing in user...');

            // Step 1: Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ User signed in:', user.uid);

            // Step 2: Update/Create user document in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                // Update existing user's last login
                await updateDoc(userDocRef, {
                    lastLogin: new Date(),
                    isActive: true
                });
                console.log('📊 Updated user last login time');
            } else {
                // Create user document if it doesn't exist (for existing Firebase Auth users)
                const userData = {
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    role: 'user',
                    accountType: 'seller',
                    createdAt: new Date(), // This will show current date since we don't have original
                    lastLogin: new Date(),
                    isVerified: user.emailVerified,
                    uid: user.uid,
                    registrationMethod: 'existing_auth_user',
                    isActive: true
                };

                await setDoc(userDocRef, userData);
                console.log('📝 Created Firestore document for existing Auth user');
            }

            console.log('🎉 Login successful - user will appear in admin dashboard');

            // Navigate to home page
            navigate('/');

        } catch (err) {
            console.error('❌ Login failed:', err);

            // Handle specific Firebase errors
            switch (err.code) {
                case 'auth/user-not-found':
                    setError('No account found with this email. Please register first.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password. Please try again.');
                    break;
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many failed attempts. Please try again later.');
                    break;
                case 'auth/network-request-failed':
                    setError('Network error. Please check your internet connection.');
                    break;
                case 'auth/invalid-credential':
                    setError('Invalid email or password. Please check your credentials.');
                    break;
                default:
                    setError(err.message || 'Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login to UTMCF Marketplace</h2>
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '🔄 Signing in...' : 'Login'}
                    </button>
                </form>
                {error && (
                    <div style={{
                        color: 'red',
                        backgroundColor: '#ffebee',
                        padding: '10px',
                        borderRadius: '5px',
                        marginTop: '10px',
                        fontSize: '0.9rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}
                <p>
                    Don't have an account? <Link to="/register">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
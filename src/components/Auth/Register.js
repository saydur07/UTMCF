import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirm) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password should be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            console.log('🔐 Creating user in Firebase Auth...');

            // Step 1: Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ User created in Firebase Auth:', user.uid);

            // Step 2: Save user data to Firestore for admin dashboard
            const userData = {
                email: email,
                displayName: displayName || email.split('@')[0], // Use email prefix if no name provided
                role: 'user',
                accountType: 'seller', // Since all users are sellers in your marketplace
                createdAt: new Date(),
                lastLogin: new Date(),
                isVerified: user.emailVerified,
                uid: user.uid,
                registrationMethod: 'email',
                isActive: true
            };

            await setDoc(doc(db, 'users', user.uid), userData);

            console.log('✅ User data saved to Firestore');
            console.log('📊 User will now appear in admin dashboard');

            // Success message
            alert('🎉 Registration successful! Welcome to UTMCF Marketplace!');

            // Navigate to home page
            navigate('/');

        } catch (err) {
            console.error('❌ Registration failed:', err);

            // Handle specific Firebase errors
            switch (err.code) {
                case 'auth/email-already-in-use':
                    setError('This email is already registered. Please use a different email or try logging in.');
                    break;
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.');
                    break;
                case 'auth/weak-password':
                    setError('Password is too weak. Please use at least 6 characters.');
                    break;
                case 'auth/network-request-failed':
                    setError('Network error. Please check your internet connection.');
                    break;
                default:
                    setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Register for UTMCF Marketplace</h2>
                <form onSubmit={handleRegister}>
                    <input
                        type="text"
                        placeholder="Full Name (optional)"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
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
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
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
                        {loading ? '🔄 Creating Account...' : 'Register'}
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
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
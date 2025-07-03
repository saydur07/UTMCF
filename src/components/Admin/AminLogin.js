// src/components/Admin/AdminLogin.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './AdminLogin.css';

const AdminLogin = ({ onAdminLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        adminKey: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAdminKey, setShowAdminKey] = useState(false);

    // Predefined admin credentials (in production, store these securely)
    const ADMIN_CREDENTIALS = {
        email: 'admin@utmcf.edu.my',
        adminKey: 'ASDQW'
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error when user types
    };

    const validateAdminCredentials = () => {
        // Check if email matches admin email
        if (formData.email !== ADMIN_CREDENTIALS.email) {
            throw new Error('Invalid admin email address');
        }

        // Check admin key
        if (formData.adminKey !== ADMIN_CREDENTIALS.adminKey) {
            throw new Error('Invalid admin access key');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate admin credentials first
            validateAdminCredentials();

            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            // Verify admin role in Firestore
            const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));

            if (!adminDoc.exists() || !adminDoc.data().isAdmin) {
                throw new Error('Access denied: Admin privileges required');
            }

            // Success - call parent component's login handler
            onAdminLogin({
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                role: 'admin',
                loginTime: new Date().toISOString()
            });

        } catch (error) {
            console.error('Admin login error:', error);
            setError(error.message || 'Failed to login as admin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <div className="admin-header">
                    <div className="admin-logo">
                        <span className="shield-icon">🛡️</span>
                        <h1>UTMCF Admin Portal</h1>
                    </div>
                    <p className="admin-subtitle">Secure Administrative Access</p>
                </div>

                <form onSubmit={handleSubmit} className="admin-form">
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Admin Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter admin email"
                            required
                            className="admin-input"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Enter password"
                            required
                            className="admin-input"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="adminKey">
                            Admin Access Key
                            <button
                                type="button"
                                className="key-toggle"
                                onClick={() => setShowAdminKey(!showAdminKey)}
                                title="Toggle visibility"
                            >
                                {showAdminKey ? '🙈' : '👁️'}
                            </button>
                        </label>
                        <input
                            type={showAdminKey ? "text" : "password"}
                            id="adminKey"
                            name="adminKey"
                            value={formData.adminKey}
                            onChange={handleInputChange}
                            placeholder="Enter admin access key"
                            required
                            className="admin-input admin-key-input"
                        />
                    </div>

                    <button
                        type="submit"
                        className="admin-login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Verifying...
                            </>
                        ) : (
                            <>
                                <span className="login-icon">🔐</span>
                                Secure Admin Login
                            </>
                        )}
                    </button>
                </form>

                <div className="admin-footer">
                    <div className="security-info">
                        <span className="lock-icon">🔒</span>
                        <small>This is a secure administrative portal. All login attempts are logged.</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
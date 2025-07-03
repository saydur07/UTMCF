// src/components/Admin/AdminDashboard.js - UPDATED WITH BACKEND INTEGRATION
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './AdminDashboard.css';

const AdminDashboard = ({ adminUser, onLogout }) => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [systemStatus, setSystemStatus] = useState({
        isUnderMaintenance: false,
        maintenanceMessage: '',
        scheduledStart: '',
        scheduledEnd: '',
        lastUpdated: null
    });
    const [maintenanceForm, setMaintenanceForm] = useState({
        message: 'System is currently under maintenance. Please try again later.',
        startDateTime: '',
        endDateTime: ''
    });
    const [activeTab, setActiveTab] = useState('sellers');
    const [backendStatus, setBackendStatus] = useState('checking');

    // Backend API URL
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    useEffect(() => {
        checkBackendHealth();
        fetchSellers();
        fetchSystemStatus();
    }, []);

    // Check if backend server is running
    const checkBackendHealth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/health`);
            if (response.ok) {
                setBackendStatus('connected');
                console.log('✅ Backend server connected');
            } else {
                setBackendStatus('error');
            }
        } catch (error) {
            setBackendStatus('disconnected');
            console.log('❌ Backend server disconnected');
        }
    };

    const fetchSellers = async () => {
        setLoading(true);
        try {
            const sellersData = [];

            // Fetch users from Firestore 'users' collection
            try {
                const usersCollection = collection(db, 'users');
                const firestoreSnapshot = await getDocs(usersCollection);

                console.log('📊 Firestore users found:', firestoreSnapshot.size);

                firestoreSnapshot.forEach((doc) => {
                    const userData = doc.data();

                    // Exclude admin users
                    const isAdmin = userData.role === 'admin' || userData.isAdmin === true;

                    if (!isAdmin) {
                        sellersData.push({
                            id: doc.id,
                            source: 'firestore',
                            email: userData.email || 'No email',
                            displayName: userData.displayName ||
                                userData.name ||
                                userData.email?.split('@')[0] ||
                                'User ' + doc.id.substring(0, 4),
                            registrationDate: userData.createdAt?.toDate?.() ||
                                userData.dateCreated?.toDate?.() ||
                                new Date(),
                            lastActive: userData.lastLogin?.toDate?.() ||
                                userData.lastActive?.toDate?.() ||
                                'Never',
                            phone: userData.phone || null,
                            role: userData.role || 'user',
                            isVerified: userData.emailVerified || false,
                            uid: userData.uid || doc.id
                        });
                    }
                });
            } catch (firestoreError) {
                console.log('⚠️ Firestore users fetch failed:', firestoreError.message);
            }

            console.log('📋 Final users data:', sellersData);
            setSellers(sellersData.sort((a, b) => b.registrationDate - a.registrationDate));

        } catch (error) {
            console.error('❌ Error fetching users:', error);
            alert('Failed to fetch users data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Complete user deletion with backend API
    const handleCompleteDeleteUser = async (user) => {
        // Check backend connection first
        if (backendStatus !== 'connected') {
            alert(`❌ Backend Server Not Available\n\nStatus: ${backendStatus}\n\nPlease:\n1. Make sure backend server is running\n2. Check http://localhost:3001/api/health\n3. Restart the backend server if needed\n\nCannot delete users without backend connection.`);
            return;
        }

        const confirmMessage = `⚠️ COMPLETE SYSTEM DELETION

Are you sure you want to PERMANENTLY delete this user?

User: ${user.displayName}
Email: ${user.email}
ID: ${user.id}

This action will:
• Delete user from Firebase Authentication (backend)
• Delete user from Firestore database  
• Delete all related user data (products, orders)
• Remove user completely from entire system
• This action CANNOT be undone

Type "DELETE COMPLETELY" to confirm:`;

        const confirmation = window.prompt(confirmMessage);

        if (confirmation !== 'DELETE COMPLETELY') {
            if (confirmation !== null) {
                alert('❌ Deletion cancelled. You must type "DELETE COMPLETELY" exactly to confirm.');
            }
            return;
        }

        // Second confirmation
        const finalConfirm = window.confirm(
            `🚨 FINAL CONFIRMATION - COMPLETE SYSTEM DELETION\n\nYou are about to PERMANENTLY delete:\n${user.displayName} (${user.email})\n\nThis will:\n• Remove user from Firebase Authentication\n• Delete all user data from Firestore\n• Remove all related data (products, orders)\n• Completely erase user from the entire system\n\nThis action CANNOT be undone!\n\nClick OK to proceed.`
        );

        if (!finalConfirm) {
            alert('✅ Deletion cancelled for safety.');
            return;
        }

        try {
            console.log('🗑️ Starting complete system deletion:', user.uid, user.email);

            // Get admin token for backend authentication
            const adminToken = await auth.currentUser.getIdToken();

            // Call backend API to delete user completely
            const response = await fetch(`${API_BASE_URL}/api/users/${user.uid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Remove from local state
                setSellers(prevSellers => prevSellers.filter(seller => seller.id !== user.uid));

                alert(`✅ USER COMPLETELY DELETED FROM ENTIRE SYSTEM!\n\nDeleted: ${result.userInfo.displayName}\nEmail: ${result.userInfo.email}\n\n✅ Removed from Firebase Authentication\n✅ Removed from Firestore database\n✅ All related data deleted\n\nUser has been permanently erased from the system.`);

                console.log('🎉 Complete user deletion successful');
            } else {
                // Handle partial success or failure
                const message = result.message || 'Unknown error occurred';
                const details = result.deletionResults ?
                    `\nDetails:\n• Firebase Auth: ${result.deletionResults.authentication ? '✅' : '❌'}\n• Firestore: ${result.deletionResults.firestore ? '✅' : '❌'}\n• Related Data: ${result.deletionResults.relatedData ? '✅' : '❌'}` : '';

                alert(`⚠️ ${message}${details}\n\nPlease check the backend server logs for more details.`);
            }

        } catch (error) {
            console.error('❌ Error during complete user deletion:', error);

            if (error.message.includes('Failed to fetch')) {
                alert(`❌ Cannot connect to backend server!\n\nPlease check:\n1. Backend server is running on port 3001\n2. Run: npm run dev in utmcf-backend folder\n3. Check http://localhost:3001/api/health\n\nError: ${error.message}`);
            } else {
                alert(`❌ Failed to completely delete user: ${error.message}\n\nThe user may still exist in Firebase Authentication.\nPlease check the backend server logs and try again.`);
            }
        }
    };

    const fetchSystemStatus = async () => {
        try {
            const statusDoc = await getDoc(doc(db, 'system', 'maintenance'));
            if (statusDoc.exists()) {
                const data = statusDoc.data();
                setSystemStatus({
                    ...data,
                    scheduledStart: data.scheduledStart || '',
                    scheduledEnd: data.scheduledEnd || ''
                });

                setMaintenanceForm({
                    message: data.maintenanceMessage || 'System is currently under maintenance. Please try again later.',
                    startDateTime: data.scheduledStart || '',
                    endDateTime: data.scheduledEnd || ''
                });
            }
        } catch (error) {
            console.error('Error fetching system status:', error);
        }
    };

    const handleMaintenanceToggle = async () => {
        try {
            const newStatus = !systemStatus.isUnderMaintenance;
            const updateData = {
                isUnderMaintenance: newStatus,
                maintenanceMessage: maintenanceForm.message,
                lastUpdated: new Date(),
                updatedBy: adminUser.email
            };

            if (newStatus) {
                updateData.scheduledStart = maintenanceForm.startDateTime;
                updateData.scheduledEnd = maintenanceForm.endDateTime;
            }

            await setDoc(doc(db, 'system', 'maintenance'), updateData, { merge: true });

            setSystemStatus(prev => ({
                ...prev,
                ...updateData
            }));

            alert(`System maintenance ${newStatus ? 'enabled' : 'disabled'} successfully!`);
        } catch (error) {
            console.error('Error updating maintenance status:', error);
            alert('Failed to update maintenance status');
        }
    };

    const handleScheduleMaintenance = async () => {
        if (!maintenanceForm.startDateTime || !maintenanceForm.endDateTime) {
            alert('Please set both start and end date/time for scheduled maintenance');
            return;
        }

        const startTime = new Date(maintenanceForm.startDateTime);
        const endTime = new Date(maintenanceForm.endDateTime);

        if (startTime >= endTime) {
            alert('End time must be after start time');
            return;
        }

        try {
            const updateData = {
                isUnderMaintenance: false,
                maintenanceMessage: maintenanceForm.message,
                scheduledStart: maintenanceForm.startDateTime,
                scheduledEnd: maintenanceForm.endDateTime,
                lastUpdated: new Date(),
                updatedBy: adminUser.email,
                isScheduled: true
            };

            await setDoc(doc(db, 'system', 'maintenance'), updateData, { merge: true });

            setSystemStatus(prev => ({
                ...prev,
                ...updateData
            }));

            alert('Maintenance scheduled successfully!');
        } catch (error) {
            console.error('Error scheduling maintenance:', error);
            alert('Failed to schedule maintenance');
        }
    };

    const formatDate = (date) => {
        if (!date || date === 'Never') return 'Never';
        return new Date(date).toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSellerStats = () => {
        const totalSellers = sellers.length;
        const activeSellers = sellers.filter(seller => {
            if (seller.lastActive === 'Never') return false;

            const lastActiveDate = new Date(seller.lastActive);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            return lastActiveDate > thirtyDaysAgo;
        }).length;

        const newSellers = sellers.filter(seller => {
            const registrationDate = new Date(seller.registrationDate);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            return registrationDate > sevenDaysAgo;
        }).length;

        const verifiedSellers = sellers.filter(seller => seller.isVerified).length;

        return { totalSellers, activeSellers, newSellers, verifiedSellers };
    };

    const stats = getSellerStats();

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>🛡️ UTMCF Admin Dashboard</h1>
                    <p>Welcome back, {adminUser.email}</p>
                    <div className="backend-status">
                        Backend: <span className={`status-${backendStatus}`}>
                            {backendStatus === 'connected' && '✅ Connected'}
                            {backendStatus === 'disconnected' && '❌ Disconnected'}
                            {backendStatus === 'checking' && '⏳ Checking...'}
                            {backendStatus === 'error' && '⚠️ Error'}
                        </span>
                    </div>
                </div>
                <button onClick={onLogout} className="logout-btn">
                    <span>🚪</span> Logout
                </button>
            </header>

            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'sellers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sellers')}
                >
                    👥 Users Management
                </button>
                <button
                    className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('maintenance')}
                >
                    🔧 System Maintenance
                </button>
            </div>

            {activeTab === 'sellers' && (
                <div className="sellers-section">
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon">👤</div>
                            <div className="stat-info">
                                <h3>{stats.totalSellers}</h3>
                                <p>Total Users</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-info">
                                <h3>{stats.activeSellers}</h3>
                                <p>Active (30 days)</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🆕</div>
                            <div className="stat-info">
                                <h3>{stats.newSellers}</h3>
                                <p>New (7 days)</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🔐</div>
                            <div className="stat-info">
                                <h3>{stats.verifiedSellers}</h3>
                                <p>Verified</p>
                            </div>
                        </div>
                    </div>

                    <div className="sellers-table-container">
                        <div className="table-header">
                            <h2>📋 All Registered Users</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button onClick={checkBackendHealth} className="refresh-btn">
                                    🔗 Check Backend
                                </button>
                                <button onClick={fetchSellers} className="refresh-btn" disabled={loading}>
                                    {loading ? '⏳' : '📊'} Refresh Data
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner-large"></div>
                                <p>Loading users data...</p>
                            </div>
                        ) : (
                            <div className="sellers-table">
                                {sellers.length === 0 ? (
                                    <div className="no-data">
                                        <h3>📝 No users found</h3>
                                        <p>Register some users to see them appear here!</p>
                                    </div>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>User Info</th>
                                                <th>Email</th>
                                                <th>Registration Date</th>
                                                <th>Last Active</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sellers.map((seller) => (
                                                <tr key={seller.id}>
                                                    <td>
                                                        <div className="seller-info">
                                                            <div className="seller-avatar">
                                                                {seller.displayName ? seller.displayName.charAt(0).toUpperCase() : '👤'}
                                                            </div>
                                                            <div>
                                                                <div className="seller-name">
                                                                    {seller.displayName}
                                                                </div>
                                                                <div className="seller-id">ID: {seller.id.substring(0, 8)}...</div>
                                                                {seller.phone && (
                                                                    <div className="seller-phone">📞 {seller.phone}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="seller-email">
                                                        {seller.email}
                                                        {seller.isVerified && <span style={{ color: '#22543d', fontSize: '0.8rem', marginLeft: '5px' }}>✅</span>}
                                                    </td>
                                                    <td>{formatDate(seller.registrationDate)}</td>
                                                    <td>{formatDate(seller.lastActive)}</td>
                                                    <td>
                                                        <span className={`status-badge ${seller.lastActive !== 'Never' &&
                                                            new Date() - new Date(seller.lastActive) < 30 * 24 * 60 * 60 * 1000
                                                            ? 'active' : 'inactive'
                                                            }`}>
                                                            {seller.lastActive !== 'Never' &&
                                                                new Date() - new Date(seller.lastActive) < 30 * 24 * 60 * 60 * 1000
                                                                ? '🟢 Active' : '🔴 Inactive'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                onClick={() => handleCompleteDeleteUser(seller)}
                                                                className="delete-btn"
                                                                title="Completely Delete User from Entire System"
                                                                disabled={backendStatus !== 'connected'}
                                                            >
                                                                🗑️ Delete Completely
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'maintenance' && (
                <div className="maintenance-section">
                    <div className="system-status-card">
                        <h2>🔧 System Status</h2>
                        <div className={`status-indicator ${systemStatus.isUnderMaintenance ? 'maintenance' : 'active'}`}>
                            <span className="status-dot"></span>
                            <span className="status-text">
                                {systemStatus.isUnderMaintenance ? 'Under Maintenance' : 'System Active'}
                            </span>
                        </div>
                        {systemStatus.lastUpdated && (
                            <p className="last-updated">
                                Last updated: {formatDate(systemStatus.lastUpdated.toDate?.() || systemStatus.lastUpdated)}
                            </p>
                        )}
                    </div>

                    <div className="maintenance-controls">
                        <h3>🚨 Immediate Maintenance Control</h3>
                        <div className="maintenance-form">
                            <div className="form-group">
                                <label>Maintenance Message:</label>
                                <textarea
                                    value={maintenanceForm.message}
                                    onChange={(e) => setMaintenanceForm(prev => ({
                                        ...prev,
                                        message: e.target.value
                                    }))}
                                    placeholder="Enter maintenance message for users..."
                                    rows="3"
                                />
                            </div>

                            <button
                                onClick={handleMaintenanceToggle}
                                className={`maintenance-toggle-btn ${systemStatus.isUnderMaintenance ? 'disable' : 'enable'}`}
                            >
                                {systemStatus.isUnderMaintenance ? '✅ End Maintenance' : '🚨 Start Maintenance'}
                            </button>
                        </div>
                    </div>

                    <div className="scheduled-maintenance">
                        <h3>⏰ Schedule Maintenance</h3>
                        <div className="schedule-form">
                            <div className="datetime-group">
                                <div className="form-group">
                                    <label>Start Date & Time:</label>
                                    <input
                                        type="datetime-local"
                                        value={maintenanceForm.startDateTime}
                                        onChange={(e) => setMaintenanceForm(prev => ({
                                            ...prev,
                                            startDateTime: e.target.value
                                        }))}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>End Date & Time:</label>
                                    <input
                                        type="datetime-local"
                                        value={maintenanceForm.endDateTime}
                                        onChange={(e) => setMaintenanceForm(prev => ({
                                            ...prev,
                                            endDateTime: e.target.value
                                        }))}
                                        min={maintenanceForm.startDateTime || new Date().toISOString().slice(0, 16)}
                                    />
                                </div>
                            </div>

                            <button onClick={handleScheduleMaintenance} className="schedule-btn">
                                📅 Schedule Maintenance
                            </button>
                        </div>

                        {systemStatus.scheduledStart && systemStatus.scheduledEnd && (
                            <div className="scheduled-info">
                                <h4>📋 Scheduled Maintenance:</h4>
                                <p>Start: {formatDate(systemStatus.scheduledStart)}</p>
                                <p>End: {formatDate(systemStatus.scheduledEnd)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
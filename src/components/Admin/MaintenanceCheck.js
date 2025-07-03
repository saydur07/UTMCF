// src/components/Admin/MaintenanceCheck.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import './MaintenanceCheck.css';

const MaintenanceCheck = ({ children }) => {
    const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [scheduledEnd, setScheduledEnd] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Check authentication state and admin status
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                // Check if current user is admin
                try {
                    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                    const userIsAdmin = adminDoc.exists() && adminDoc.data().isAdmin;
                    setIsAdmin(userIsAdmin);
                    console.log('🛡️ Admin status:', userIsAdmin ? 'ADMIN USER' : 'REGULAR USER');
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    setIsAdmin(false);
                }
            } else {
                setCurrentUser(null);
                setIsAdmin(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        checkMaintenanceStatus();

        // Check maintenance status every 10 seconds for more responsive auto-ending
        const interval = setInterval(checkMaintenanceStatus, 10000);

        return () => clearInterval(interval);
    }, []);

    const checkMaintenanceStatus = async () => {
        try {
            const statusDoc = await getDoc(doc(db, 'system', 'maintenance'));

            if (statusDoc.exists()) {
                const data = statusDoc.data();
                const now = new Date();

                let maintenanceActive = data.isUnderMaintenance || false;
                let shouldAutoEnd = false;

                // Check if scheduled maintenance should be active or should end
                if (data.scheduledStart && data.scheduledEnd) {
                    const startTime = new Date(data.scheduledStart);
                    const endTime = new Date(data.scheduledEnd);

                    console.log('⏰ Checking scheduled maintenance:');
                    console.log('   Current time:', now.toLocaleString());
                    console.log('   Scheduled start:', startTime.toLocaleString());
                    console.log('   Scheduled end:', endTime.toLocaleString());

                    if (now >= startTime && now <= endTime) {
                        // Within scheduled maintenance window
                        maintenanceActive = true;
                        console.log('🔧 Within scheduled maintenance window - enabling maintenance');
                    } else if (now > endTime && (data.isUnderMaintenance || data.isScheduled)) {
                        // Past end time and maintenance is still active - auto end it
                        shouldAutoEnd = true;
                        maintenanceActive = false;
                        console.log('✅ Scheduled maintenance end time reached - auto-ending maintenance');
                    }
                }

                // Auto-end maintenance if scheduled time has passed
                if (shouldAutoEnd) {
                    try {
                        const updateData = {
                            isUnderMaintenance: false,
                            isScheduled: false,
                            lastUpdated: new Date(),
                            updatedBy: 'system_auto_end',
                            autoEndedAt: new Date(),
                            scheduledStart: null, // Clear schedule after auto-end
                            scheduledEnd: null
                        };

                        await updateDoc(doc(db, 'system', 'maintenance'), updateData);
                        console.log('🤖 Auto-ended maintenance and cleared schedule');

                        // Update local state
                        setIsUnderMaintenance(false);
                        setScheduledEnd('');

                        return; // Exit early as we've updated the status
                    } catch (error) {
                        console.error('❌ Failed to auto-end maintenance:', error);
                    }
                }

                setIsUnderMaintenance(maintenanceActive);
                setMaintenanceMessage(data.maintenanceMessage || 'System is currently under maintenance. Please try again later.');
                setScheduledEnd(data.scheduledEnd || '');

                console.log('🔧 Maintenance status:', maintenanceActive ? 'MAINTENANCE MODE' : 'SYSTEM ACTIVE');
            } else {
                setIsUnderMaintenance(false);
            }
        } catch (error) {
            console.error('Error checking maintenance status:', error);
            // If we can't check status, assume system is working
            setIsUnderMaintenance(false);
        } finally {
            setLoading(false);
        }
    };

    const getTimeRemaining = () => {
        if (!scheduledEnd) return '';

        const now = new Date();
        const endTime = new Date(scheduledEnd);
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
            return 'Maintenance should end shortly...';
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `Estimated completion: ${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `Estimated completion: ${minutes}m ${seconds}s`;
        } else {
            return `Estimated completion: ${seconds}s`;
        }
    };

    if (loading) {
        return (
            <div className="maintenance-loading">
                <div className="spinner"></div>
                <p>Checking system status...</p>
            </div>
        );
    }

    // ADMIN BYPASS: If user is admin, always allow access regardless of maintenance
    if (isAdmin) {
        console.log('🛡️ Admin bypass: Allowing admin access during maintenance');
        return <>{children}</>;
    }

    // MAINTENANCE MODE: Block regular users only
    if (isUnderMaintenance) {
        return (
            <div className="maintenance-screen">
                <div className="maintenance-container">
                    <div className="maintenance-icon">
                        <span className="wrench">🔧</span>
                        <span className="gear">⚙️</span>
                    </div>

                    <h1>System Under Maintenance</h1>

                    <div className="maintenance-message">
                        <p>{maintenanceMessage}</p>
                    </div>

                    {scheduledEnd && (
                        <div className="time-remaining">
                            <p>{getTimeRemaining()}</p>
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#666',
                                marginTop: '5px'
                            }}>
                                Auto-refresh every 10 seconds
                            </div>
                        </div>
                    )}

                    <div className="maintenance-details">
                        <div className="detail-item">
                            <span className="icon">🏢</span>
                            <span>UTMCF Marketplace</span>
                        </div>
                        <div className="detail-item">
                            <span className="icon">📧</span>
                            <span>support@utmcf.edu.my</span>
                        </div>
                        <div className="detail-item">
                            <span className="icon">🕒</span>
                            <span>Status checked: {new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>

                    <div className="maintenance-actions">
                        <button
                            onClick={checkMaintenanceStatus}
                            className="refresh-status-btn"
                        >
                            <span>🔄</span>
                            Check Status Now
                        </button>
                    </div>

                    <div className="maintenance-footer">
                        <p>We apologize for any inconvenience caused.</p>
                        <p>The system will automatically resume when maintenance is complete.</p>

                        {/* Hidden admin access hint */}
                        <div style={{
                            marginTop: '30px',
                            fontSize: '0.7rem',
                            opacity: 0.3,
                            color: '#666'
                        }}>
                            Admin? Access the portal to manage maintenance.
                        </div>
                    </div>
                </div>

                {/* Animated background elements */}
                <div className="bg-elements">
                    <div className="floating-element" style={{ '--delay': '0s', '--duration': '6s' }}>🔧</div>
                    <div className="floating-element" style={{ '--delay': '2s', '--duration': '8s' }}>⚙️</div>
                    <div className="floating-element" style={{ '--delay': '4s', '--duration': '7s' }}>🔨</div>
                    <div className="floating-element" style={{ '--delay': '1s', '--duration': '9s' }}>🛠️</div>
                </div>
            </div>
        );
    }

    // NORMAL MODE: Allow all users access
    return <>{children}</>;
};

export default MaintenanceCheck;


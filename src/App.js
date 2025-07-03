// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Import your existing components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Pages/Home';
import Marketplace from './components/Pages/Marketplace';
import Fundraising from './components/Pages/Fundraising';
import AddItem from './components/Pages/AddItem';
import Navbar from './components/Layout/Navbar';
import Cart from './components/Pages/Cart';
import MyListings from './components/Pages/MyListings';
import EditListing from './components/Pages/EditListings';

// Import new campaign components
import CreateCampaign from './components/Pages/CreateCampaign';
import MyCampaigns from './components/Pages/MyCampaigns';
import CampaignDetails from './components/Pages/CampaignDetalis';
import EditCampaign from './components/Pages/EditCampaign';

// Import new admin components
import AdminLogin from './components/Admin/AminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import MaintenanceCheck from './components/Admin/MaintenanceCheck';

// Import contexts
import { CartProvider } from './context/CartContext';
import { CampaignProvider } from './context/CampaignContext';
import './App.css';

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [showAdminLogin, setShowAdminLogin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Check if user is admin
                    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                    if (adminDoc.exists() && adminDoc.data().isAdmin) {
                        setIsAdmin(true);
                        setAdminUser({
                            uid: user.uid,
                            email: user.email,
                            role: 'admin'
                        });
                        setUser(null); // Don't set as regular user if admin
                        console.log('🛡️ Admin user detected:', user.email);
                    } else {
                        setIsAdmin(false);
                        setAdminUser(null);
                        setUser(user);
                        console.log('👤 Regular user detected:', user.email);
                    }
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    // If there's an error checking admin status, treat as regular user
                    setIsAdmin(false);
                    setAdminUser(null);
                    setUser(user);
                }
            } else {
                setUser(null);
                setIsAdmin(false);
                setAdminUser(null);
                console.log('🚪 User logged out');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAdminLogin = (adminData) => {
        setAdminUser(adminData);
        setIsAdmin(true);
        setShowAdminLogin(false);
        console.log('🛡️ Admin logged in successfully');
    };

    const handleAdminLogout = () => {
        auth.signOut();
        setAdminUser(null);
        setIsAdmin(false);
        setShowAdminLogin(false);
        console.log('🛡️ Admin logged out');
    };

    // Admin access control - hidden feature
    const toggleAdminLogin = () => {
        const adminAccess = window.prompt('🛡️ Enter admin access code:');
        if (adminAccess === 'UTMCF2024') {
            setShowAdminLogin(true);
        } else if (adminAccess !== null) {
            alert('❌ Invalid access code');
        }
    };

    // Loading screen
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <h2>🏢 UTMCF Marketplace</h2>
                    <p>Loading your marketplace experience...</p>
                </div>
            </div>
        );
    }

    // Admin login screen - NEVER wrapped by MaintenanceCheck
    if (showAdminLogin && !isAdmin) {
        return <AdminLogin onAdminLogin={handleAdminLogin} />;
    }

    // Admin dashboard - NEVER wrapped by MaintenanceCheck  
    if (isAdmin && adminUser) {
        return <AdminDashboard adminUser={adminUser} onLogout={handleAdminLogout} />;
    }

    // Regular app with maintenance check - ONLY for regular users
    return (
        <CartProvider>
            <CampaignProvider>
                <Router>
                    <Routes>
                        {/* Admin routes - NO maintenance check */}
                        <Route
                            path="/utmcf-admin-portal-2024"
                            element={<AdminLogin onAdminLogin={handleAdminLogin} />}
                        />

                        {/* Regular user routes - WITH maintenance check */}
                        <Route
                            path="/*"
                            element={
                                <MaintenanceCheck>
                                    <div className="App">
                                        <Navbar user={user} />
                                        <main className="main-content">
                                            <Routes>
                                                <Route path="/" element={<Home />} />
                                                <Route path="/marketplace" element={<Marketplace />} />
                                                <Route path="/fundraising" element={<Fundraising />} />
                                                <Route path="/login" element={<Login />} />
                                                <Route path="/register" element={<Register />} />
                                                <Route path="/add-item" element={<AddItem />} />
                                                <Route path="/cart" element={<Cart />} />
                                                <Route path="/my-listings" element={<MyListings />} />
                                                <Route path="/edit-listing/:id" element={<EditListing />} />

                                                {/* Campaign routes */}
                                                <Route path="/create-campaign" element={<CreateCampaign />} />
                                                <Route path="/my-campaigns" element={<MyCampaigns />} />
                                                <Route path="/campaign/:campaignId" element={<CampaignDetails />} />
                                                <Route path="/edit-campaign/:campaignId" element={<EditCampaign />} />
                                            </Routes>
                                        </main>

                                        {/* Hidden admin access - Triple click on logo to access */}
                                        <div
                                            className="hidden-admin-trigger"
                                            onClick={(e) => {
                                                if (e.detail === 3) { // Triple click
                                                    toggleAdminLogin();
                                                }
                                            }}
                                            title="UTMCF Admin Access"
                                        >
                                            {/* This will be invisible but clickable */}
                                        </div>

                                        {/* Development mode admin button */}
                                        {process.env.NODE_ENV === 'development' && (
                                            <button
                                                className="dev-admin-btn"
                                                onClick={toggleAdminLogin}
                                                title="Admin Access (Dev Mode Only)"
                                            >
                                                🛡️
                                            </button>
                                        )}
                                    </div>
                                </MaintenanceCheck>
                            }
                        />
                    </Routes>
                </Router>
            </CampaignProvider>
        </CartProvider>
    );
};

export default App;
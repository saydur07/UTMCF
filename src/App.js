// src/App.js - Updated with Chat Trigger
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
import Support from './components/Customer/Support';
import ProductDetail from './components/Pages/ProductDetail';

// Import new campaign components
import CreateCampaign from './components/Pages/CreateCampaign';
import MyCampaigns from './components/Pages/MyCampaigns';
import CampaignDetails from './components/Pages/CampaignDetalis';
import EditCampaign from './components/Pages/EditCampaign';

// Import new admin components
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import MaintenanceCheck from './components/Admin/MaintenanceCheck';

// Import marketplace payment system components
import CheckoutOptions from './components/Pages/CheckoutOptions';
import Orders from './components/Pages/Orders';
import SellerOrderManagement from './components/Pages/SellerOrderManagement';
import OrderChat from './components/Payment/OrderChat';

//  Import chat components
import ChatSidebar from './components/Chat/ChatSidebar';
import ChatTrigger from './components/Chat/ChatTrigger';

// Import contexts
import { CartProvider } from './context/CartContext';
import { CampaignProvider } from './context/CampaignContext';
import { ChatProvider } from './context/ChatContext';
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
    // In your App.js, replace the entire return statement with this:

    return (
        <CartProvider>
            <CampaignProvider>
                <ChatProvider>
                    <Router>
                        {/* Admin icon for ALL pages - OUTSIDE the routes */}
                        {!isAdmin && !showAdminLogin && (
                            <div
                                onClick={toggleAdminLogin}
                                title="System Access"
                                style={{
                                    position: 'fixed',
                                    bottom: '10px',
                                    left: '10px',
                                    width: '28px',
                                    height: '28px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: 0.05, // Almost invisible
                                    zIndex: 10000,
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'all 0.4s ease',
                                    filter: 'grayscale(1) brightness(1.2)' // Makes it blend with background
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.opacity = 0.4; // Visible on hover
                                    e.target.style.backgroundColor = 'rgba(58, 134, 255, 0.05)';
                                    e.target.style.transform = 'scale(1.15)';
                                    e.target.style.filter = 'grayscale(0) brightness(1)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.opacity = 0.05;
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.transform = 'scale(1)';
                                    e.target.style.filter = 'grayscale(1) brightness(1.2)';
                                }}
                            >
                                🛡️
                            </div>
                        )}

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
                                                    <Route path="/product/:productId" element={<ProductDetail />} /> {/* NEW ROUTE */}
                                                    <Route path="/fundraising" element={<Fundraising />} />
                                                    <Route path="/login" element={<Login />} />
                                                    <Route path="/register" element={<Register />} />
                                                    <Route path="/add-item" element={<AddItem />} />
                                                    <Route path="/cart" element={<Cart />} />
                                                    <Route path="/my-listings" element={<MyListings />} />
                                                    <Route path="/edit-listing/:id" element={<EditListing />} />
                                                    <Route path="/support" element={<Support />} />

                                                    {/* Campaign routes */}
                                                    <Route path="/create-campaign" element={<CreateCampaign />} />
                                                    <Route path="/my-campaigns" element={<MyCampaigns />} />
                                                    <Route path="/campaign/:campaignId" element={<CampaignDetails />} />
                                                    <Route path="/edit-campaign/:campaignId" element={<EditCampaign />} />

                                                    {/* Marketplace payment routes */}
                                                    <Route path="/checkout" element={<CheckoutOptions />} />
                                                    <Route path="/orders" element={<Orders />} />
                                                    <Route path="/my-sales" element={<SellerOrderManagement />} />

                                                    {/* Order chat route */}
                                                    <Route path="/order/:orderId" element={<OrderChat />} />
                                                </Routes>
                                            </main>

                                            {/* Chat Components - Only when user is logged in */}
                                            {user && (
                                                <>
                                                    <ChatTrigger />
                                                    <ChatSidebar />
                                                </>
                                            )}
                                        </div>
                                    </MaintenanceCheck>
                                }
                            />
                        </Routes>
                    </Router>
                </ChatProvider>
            </CampaignProvider>
        </CartProvider>
    );
};

export default App;
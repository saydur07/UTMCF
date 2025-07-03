// src/components/Layout/Navbar.js - Keep your existing navbar exactly as it is!
// No changes needed - offers will go to chat system automatically

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useCart } from '../../context/CartContext';
import { useChat } from '../../context/ChatContext';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const { getCartCount, clearCart } = useCart();
    const { unreadCount, toggleChatSidebar, conversations } = useChat();
    const dropdownRef = useRef(null);

    // Store cart count in state to trigger re-renders
    const [cartCount, setCartCount] = useState(0);

    // Update cart count every time the component renders
    useEffect(() => {
        const count = getCartCount();
        console.log('Navbar - Cart count:', count);
        setCartCount(count);
    }, [getCartCount]);

    // Log chat state for debugging
    useEffect(() => {
        console.log('Navbar - Chat state:', {
            unreadCount,
            conversations: conversations.length,
            user: user?.email
        });
    }, [unreadCount, conversations, user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            // Clear the cart when logging out
            clearCart();
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const toggleProfileDropdown = () => {
        setProfileDropdownOpen(!profileDropdownOpen);
    };

    const handleChatClick = () => {
        console.log('💬 Chat icon clicked - unread count:', unreadCount);
        toggleChatSidebar();
        // Close mobile menu if open
        setMobileMenuOpen(false);
    };

    // Get user initial for avatar
    const getUserInitial = () => {
        if (user && user.displayName && user.displayName.length > 0) {
            return user.displayName.charAt(0).toUpperCase();
        } else if (user && user.email && user.email.length > 0) {
            return user.email.charAt(0).toUpperCase();
        }
        return "U";
    };

    return (
        <nav className="navbar">
            <div className="container">
                <div className="nav-left">
                    <Link to="/" className="logo">UTMCF</Link>
                    <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
                        <Link to="/marketplace" className="nav-link">Marketplace</Link>
                        <Link to="/fundraising" className="nav-link">Fundraising</Link>
                        {user && (
                            <Link to="/add-item" className="nav-link">Add Item</Link>
                        )}
                    </div>
                </div>

                <div className="nav-right">
                    {/* Only show cart and chat icons if user is logged in */}
                    {user && (
                        <>
                            {/* Cart Icon */}
                            <Link to="/cart" className="cart-icon-container">
                                <div className="cart-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="9" cy="21" r="1"></circle>
                                        <circle cx="20" cy="21" r="1"></circle>
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                    </svg>
                                    {cartCount > 0 && (
                                        <span className="cart-count">{cartCount}</span>
                                    )}
                                </div>
                            </Link>

                            {/* Chat Icon with improved badge */}
                            <button
                                className="chat-icon-container"
                                onClick={handleChatClick}
                                title={`Messages ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                            >
                                <div className="chat-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    {/* Show badge when unreadCount > 0 */}
                                    {unreadCount > 0 && (
                                        <span className="chat-count" key={unreadCount}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </>
                    )}

                    {user ? (
                        <div className="profile-dropdown-container" ref={dropdownRef}>
                            <div className="avatar" onClick={toggleProfileDropdown}>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User avatar" />
                                ) : (
                                    <div className="avatar-initial">{getUserInitial()}</div>
                                )}
                            </div>

                            {profileDropdownOpen && (
                                <div className="profile-dropdown">
                                    <div className="profile-info">
                                        <span className="user-name">{user.displayName || user.email}</span>
                                        <span className="user-email">{user.email}</span>
                                    </div>
                                    <div className="dropdown-divider"></div>

                                    {/* SELLING SECTION */}
                                    <Link to="/my-listings" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        My Listings
                                    </Link>

                                    <Link to="/my-sales" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1v6m0 0l4-4m-4 4L8 3m13 9a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            <path d="M8 12l2 2 4-4"></path>
                                        </svg>
                                        My Sales
                                    </Link>

                                    <Link to="/my-campaigns" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                            <path d="M2 17l10 5 10-5"></path>
                                            <path d="M2 12l10 5 10-5"></path>
                                        </svg>
                                        My Campaigns
                                    </Link>

                                    <div className="dropdown-divider"></div>

                                    {/* BUYING SECTION */}
                                    <Link to="/orders" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                        </svg>
                                        My Orders
                                    </Link>

                                    {/* Chat Messages Link with improved badge */}
                                    <button className="dropdown-item" onClick={handleChatClick}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Messages
                                        {unreadCount > 0 && (
                                            <span className="dropdown-badge">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    <div className="dropdown-divider"></div>

                                    {/* PROFILE SECTION */}
                                    <Link to="/support" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 12l2 2 4-4"></path>
                                            <path d="M21 2l-9 9"></path>
                                            <path d="M21 2l-6 6"></path>
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1-6.74 2.74"></path>
                                        </svg>
                                        AI Support
                                    </Link>

                                    <button className="dropdown-item logout-item" onClick={handleLogout}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                            <polyline points="16 17 21 12 16 7"></polyline>
                                            <line x1="21" y1="12" x2="9" y2="12"></line>
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="login-btn">Login</Link>
                            <Link to="/register" className="register-btn">Register</Link>
                        </div>
                    )}
                </div>

                <div className="hamburger" onClick={toggleMobileMenu}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
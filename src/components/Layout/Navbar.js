import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useCart } from '../../context/CartContext';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const { getCartCount, clearCart } = useCart();
    const dropdownRef = useRef(null);

    // Store cart count in state to trigger re-renders
    const [cartCount, setCartCount] = useState(0);

    // Update cart count every time the component renders
    useEffect(() => {
        const count = getCartCount();
        console.log('Navbar - Cart count:', count);
        setCartCount(count);
    }, [getCartCount]);

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
                    {/* Only show cart icon if user is logged in */}
                    {user && (
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
                                    <Link to="/my-listings" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        My Listings
                                    </Link>
                                    <Link to="/my-campaigns" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                            <path d="M2 17l10 5 10-5"></path>
                                            <path d="M2 12l10 5 10-5"></path>
                                        </svg>
                                        My Campaigns
                                    </Link>
                                    <Link to="/profile" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        Profile
                                    </Link>
                                    <Link to="/orders" className="dropdown-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                            <path d="M2 17l10 5 10-5"></path>
                                            <path d="M2 12l10 5 10-5"></path>
                                        </svg>
                                        My Orders
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
// src/components/pages/Home.js - Funky Interactive Home Page
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import './Home.css';

const Home = () => {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalCampaigns: 0
    });
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Fetch products count and featured products
                const productsQuery = query(
                    collection(db, "products"),
                    orderBy("createdAt", "desc"),
                    limit(6)
                );
                const productsSnapshot = await getDocs(productsQuery);
                const products = [];
                productsSnapshot.forEach((doc) => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                setFeaturedProducts(products);

                // Fetch campaigns count and featured campaigns
                const campaignQuery = query(
                    collection(db, "campaigns"),
                    orderBy("createdAt", "desc"),
                    limit(3)
                );
                const campaignsSnapshot = await getDocs(campaignQuery);
                const campaigns = [];
                campaignsSnapshot.forEach((doc) => {
                    campaigns.push({ id: doc.id, ...doc.data() });
                });
                setFeaturedCampaigns(campaigns);

                // Get total counts
                const allProductsSnapshot = await getDocs(collection(db, "products"));
                const allCampaignsSnapshot = await getDocs(collection(db, "campaigns"));

                setStats({
                    totalProducts: allProductsSnapshot.size,
                    totalCampaigns: allCampaignsSnapshot.size,
                    totalUsers: Math.floor(Math.random() * 500) + 100 // Simulated for demo
                });

                setLoading(false);
            } catch (error) {
                console.error("Error fetching home data:", error);
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    if (loading) {
        return (
            <div className="home-loading">
                <div className="spinner"></div>
                <p>Loading marketplace...</p>
            </div>
        );
    }

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-background">
                    <div className="floating-shapes">
                        <div className="shape shape-1"></div>
                        <div className="shape shape-2"></div>
                        <div className="shape shape-3"></div>
                        <div className="shape shape-4"></div>
                    </div>
                </div>

                <div className="hero-content">
                    <div className="hero-text">
                        <h1 className="hero-title">
                            Welcome to
                            <span className="gradient-text"> UTMCF</span>
                            <br />
                            <span className="subtitle">Marketplace & Fundraising</span>
                        </h1>
                        <p className="hero-description">
                            Your one-stop platform for buying, selling, and supporting causes.
                            Join our vibrant community of students and entrepreneurs.
                        </p>

                        <div className="hero-buttons">
                            {user ? (
                                <>
                                    <Link to="/marketplace" className="cta-button primary">
                                        <span>🛒</span>
                                        Browse Marketplace
                                    </Link>
                                    <Link to="/add-item" className="cta-button secondary">
                                        <span>➕</span>
                                        List an Item
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/register" className="cta-button primary">
                                        <span>🚀</span>
                                        Get Started
                                    </Link>
                                    <Link to="/login" className="cta-button secondary">
                                        <span>🔑</span>
                                        Login
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Live Stats */}
                    <div className="stats-container">
                        <div className="stat-card">
                            <div className="stat-number">{stats.totalProducts}</div>
                            <div className="stat-label">Products Listed</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{stats.totalCampaigns}</div>
                            <div className="stat-label">Active Campaigns</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <h2 className="section-title">What Can You Do?</h2>

                    <div className="features-grid">
                        <div className="feature-card marketplace-card">
                            <div className="feature-icon">🛍️</div>
                            <h3>Marketplace</h3>
                            <p>Buy and sell items within the UTMCF community. From textbooks to electronics, find everything you need.</p>
                            {user ? (
                                <Link to="/marketplace" className="feature-link">
                                    Explore Marketplace
                                    <span className="arrow">→</span>
                                </Link>
                            ) : (
                                <Link to="/login" className="feature-link">
                                    Login to Access
                                    <span className="arrow">→</span>
                                </Link>
                            )}
                            <div className="feature-stats">
                                <span>{stats.totalProducts} items available</span>
                            </div>
                        </div>

                        <div className="feature-card fundraising-card">
                            <div className="feature-icon">💝</div>
                            <h3>Fundraising</h3>
                            <p>Create and support meaningful campaigns. Help fellow students and contribute to important causes.</p>
                            {user ? (
                                <Link to="/fundraising" className="feature-link">
                                    View Campaigns
                                    <span className="arrow">→</span>
                                </Link>
                            ) : (
                                <Link to="/login" className="feature-link">
                                    Login to Access
                                    <span className="arrow">→</span>
                                </Link>
                            )}
                            <div className="feature-stats">
                                <span>{stats.totalCampaigns} active campaigns</span>
                            </div>
                        </div>

                        <div className="feature-card chat-card">
                            <div className="feature-icon">💬</div>
                            <h3>Real-time Chat</h3>
                            <p>Connect instantly with buyers and sellers. Negotiate prices, ask questions, and build relationships.</p>
                            {user ? (
                                <div className="feature-link disabled">
                                    Available in navbar
                                    <span className="arrow">→</span>
                                </div>
                            ) : (
                                <Link to="/login" className="feature-link">
                                    Login to Access
                                    <span className="arrow">→</span>
                                </Link>
                            )}
                            <div className="feature-stats">
                                <span>Instant messaging</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
                <section className="featured-section">
                    <div className="container">
                        <div className="section-header">
                            <h2 className="section-title">Latest Products</h2>
                            {user ? (
                                <Link to="/marketplace" className="view-all-link">
                                    View All Products →
                                </Link>
                            ) : (
                                <Link to="/login" className="view-all-link">
                                    Login to View More →
                                </Link>
                            )}
                        </div>

                        <div className="featured-grid">
                            {featuredProducts.slice(0, 3).map(product => (
                                <div key={product.id} className="featured-product">
                                    <div className="product-image">
                                        {product.images && product.images.length > 0 ? (
                                            <img src={product.images[0]} alt={product.name} />
                                        ) : (
                                            <div className="no-image">📦</div>
                                        )}
                                        <div className="product-price">RM {product.price.toFixed(2)}</div>
                                    </div>
                                    <div className="product-info">
                                        <h4>{product.name}</h4>
                                        <p className="product-seller">
                                            By {product.seller?.name || product.seller?.email || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured Campaigns */}
            {featuredCampaigns.length > 0 && (
                <section className="campaigns-section">
                    <div className="container">
                        <div className="section-header">
                            <h2 className="section-title">Active Campaigns</h2>
                            {user ? (
                                <Link to="/fundraising" className="view-all-link">
                                    View All Campaigns →
                                </Link>
                            ) : (
                                <Link to="/login" className="view-all-link">
                                    Login to View More →
                                </Link>
                            )}
                        </div>

                        <div className="campaigns-grid">
                            {featuredCampaigns.map(campaign => (
                                <div key={campaign.id} className="campaign-card">
                                    <div className="campaign-image">
                                        {campaign.images && campaign.images.length > 0 ? (
                                            <img src={campaign.images[0]} alt={campaign.title} />
                                        ) : (
                                            <div className="no-image">🎯</div>
                                        )}
                                    </div>
                                    <div className="campaign-info">
                                        <h4>{campaign.title}</h4>
                                        <p>{campaign.description?.substring(0, 100)}...</p>
                                        <div className="campaign-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${Math.min(
                                                            (campaign.currentAmount / campaign.goalAmount) * 100,
                                                            100
                                                        )}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="progress-text">
                                                RM {campaign.currentAmount || 0} / RM {campaign.goalAmount}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Call to Action */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Join Our Community?</h2>
                        <p>Whether you're looking to buy, sell, or support causes, UTMCF is here for you.</p>

                        {!user ? (
                            <div className="cta-buttons">
                                <Link to="/register" className="cta-button primary large">
                                    Create Account
                                </Link>
                                <Link to="/login" className="cta-button secondary large">
                                    Sign In
                                </Link>
                            </div>
                        ) : (
                            <div className="cta-buttons">
                                <Link to="/add-item" className="cta-button primary large">
                                    Start Selling
                                </Link>
                                <Link to="/create-campaign" className="cta-button secondary large">
                                    Create Campaign
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
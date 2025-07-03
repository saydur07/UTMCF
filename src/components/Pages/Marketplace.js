// src/components/pages/Marketplace.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import AddToCart from '../Customer/AddToCart';
import './Marketplace.css';

function MarketplaceComponent() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const user = auth.currentUser;

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);

                const productList = [];
                querySnapshot.forEach((doc) => {
                    productList.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                setProducts(productList);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching products: ", error);
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const filteredProducts = products.filter(product => {
        // Filter by category if not 'all'
        const categoryMatch = filter === 'all' || product.category === filter;

        // Search term filter
        const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

        return categoryMatch && searchMatch;
    });

    // Get unique categories for filter dropdown
    const categories = ['all', ...new Set(products.map(product => product.category).filter(Boolean))];

    // Handle product card click to navigate to detail page
    const handleProductClick = (productId, event) => {
        // Don't navigate if user clicked on Add to Cart button or its children
        if (event.target.closest('.add-to-cart-container') ||
            event.target.closest('.add-to-cart-btn') ||
            event.target.closest('button')) {
            return;
        }

        navigate(`/product/${productId}`);
    };

    return (
        <div className="marketplace-container">
            <div className="marketplace-header">
                <h1>UTMCF Marketplace</h1>
                <p>Browse all available products or list your own</p>
            </div>

            <div className="marketplace-actions">
                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="filter-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <Link to="/add-item" className="add-product-btn">
                    List Item for Sale
                </Link>
            </div>

            {loading ? (
                <div className="loading">Loading products...</div>
            ) : (
                <>
                    {filteredProducts.length > 0 ? (
                        <div className="products-grid">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className="product-card clickable"
                                    onClick={(e) => handleProductClick(product.id, e)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleProductClick(product.id, e);
                                        }
                                    }}
                                >
                                    <div className="product-image">
                                        {product.images && product.images.length > 0 ? (
                                            <img src={product.images[0]} alt={product.name} />
                                        ) : (
                                            <div className="no-image">No Image</div>
                                        )}
                                        {/* Click overlay hint */}
                                        <div className="click-overlay">
                                            <span className="view-details-text">👁️ View Details</span>
                                        </div>
                                    </div>
                                    <div className="product-info">
                                        <h3>{product.name}</h3>
                                        <p className="product-price">RM {product.price.toFixed(2)}</p>
                                        {product.seller && (
                                            <p className="product-seller">Seller: {product.seller.name || product.seller.email}</p>
                                        )}

                                        {/* Action buttons section */}
                                        <div className="product-actions">
                                            <AddToCart product={product} />

                                            {/* Quick Make Offer button */}
                                            <button
                                                className="quick-offer-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/product/${product.id}?action=offer`);
                                                }}
                                                title="Make an offer on this product"
                                            >
                                                💰 Offer
                                            </button>
                                        </div>

                                        {/* Quick stats */}
                                        <div className="product-quick-stats">
                                            <span className="product-category-tag">
                                                {product.category || 'General'}
                                            </span>
                                            <span className="product-date">
                                                {product.createdAt?.toDate?.()?.toLocaleDateString('en-MY', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                }) || 'Recent'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-products">
                            <p>No products found matching your criteria.</p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="clear-search-btn"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Quick Navigation Tips */}
            {products.length > 0 && (
                <div className="marketplace-tips">
                    <h3>💡 Tips:</h3>
                    <ul>
                        <li><strong>Click on any product</strong> to view detailed information</li>
                        <li><strong>Add to Cart</strong> for immediate purchase at listed price</li>
                        <li><strong>Make an Offer</strong> to negotiate a better price</li>
                        <li><strong>Use filters</strong> to find exactly what you're looking for</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default MarketplaceComponent;
// src/components/pages/ProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import AddToCart from '../Customer/AddToCart';
import MakeOffer from '../Customer/MakeOffer';
import './ProductDetail.css';

function ProductDetail() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerSubmitting, setOfferSubmitting] = useState(false);
    const user = auth.currentUser;

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const productDoc = await getDoc(doc(db, 'products', productId));
                if (productDoc.exists()) {
                    setProduct({ id: productDoc.id, ...productDoc.data() });
                } else {
                    console.error('Product not found');
                    navigate('/marketplace');
                }
            } catch (error) {
                console.error('Error fetching product:', error);
                navigate('/marketplace');
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchProduct();
        }
    }, [productId, navigate]);

    // Check if user wants to make an offer from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'offer' && user && product) {
            setShowOfferModal(true);
        }
    }, [user, product]);

    const handleOfferSubmit = async (offerData) => {
        if (!user || !product) {
            alert('Please login to make an offer');
            return;
        }

        const sellerId = product.sellerId || product.seller?.id;
        if (!sellerId) {
            alert('Error: Product missing seller information');
            return;
        }

        if (user.uid === sellerId) {
            alert('You cannot make an offer on your own product');
            return;
        }

        setOfferSubmitting(true);

        try {
            console.log('💰 Creating offer for product:', product.name);

            // Create offer document FIRST
            const offerDoc = {
                productId: product.id,
                productName: product.name,
                productImage: product.images?.[0] || '',
                originalPrice: product.price,
                offerAmount: parseFloat(offerData.amount),
                message: offerData.message || '',
                buyerId: user.uid,
                buyerName: user.displayName || user.email,
                buyerEmail: user.email,
                sellerId: sellerId,
                sellerName: product.seller?.name || product.seller?.email,
                sellerEmail: product.seller?.email || '',
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            };

            // Add offer to offers collection
            const offerRef = await addDoc(collection(db, 'offers'), offerDoc);
            console.log('✅ Offer created:', offerRef.id);

            // Create a unique order ID for this offer (for chat purposes)
            const offerOrderId = `offer_${offerRef.id}`;

            // Create order document for chat system with CUSTOM ID
            const orderForChat = {
                type: 'offer',
                offerId: offerRef.id,
                productId: product.id,
                productName: product.name,
                productImage: product.images?.[0] || '',
                originalPrice: product.price,
                offerAmount: parseFloat(offerData.amount),
                totalAmount: parseFloat(offerData.amount),

                // Buyer info
                buyerId: user.uid,
                buyerName: user.displayName || user.email,
                buyerEmail: user.email,

                // Seller info  
                sellerId: sellerId,
                sellerName: product.seller?.name || product.seller?.email,
                sellerEmail: product.seller?.email || '',

                status: 'offer_pending',
                paymentMethod: 'offer_negotiation',
                createdAt: new Date(),
                lastUpdated: new Date(),

                // Initial message about the offer
                messages: [{
                    senderId: user.uid,
                    senderName: user.displayName || user.email,
                    senderType: 'buyer',
                    message: `💰 NEW OFFER RECEIVED!\n\n🛍️ Product: ${product.name}\n💵 Original Price: RM ${product.price.toFixed(2)}\n🤝 Offer Amount: RM ${parseFloat(offerData.amount).toFixed(2)}\n💾 You Save: RM ${(product.price - parseFloat(offerData.amount)).toFixed(2)}\n\n${offerData.message ? `📝 Message: "${offerData.message}"\n\n` : ''}⏰ This offer expires in 7 days.\n\n✅ Accept | ❌ Decline | 🔄 Counter Offer`,
                    timestamp: new Date(),
                    read: false,
                    messageType: 'offer_notification'
                }]
            };

            // 🔥 FIX: Use setDoc with custom ID instead of addDoc
            await setDoc(doc(db, 'orders', offerOrderId), orderForChat);
            console.log('✅ Chat order created for offer with ID:', offerOrderId);

            alert('🎉 Offer submitted successfully! The seller will see it in their messages.');
            setShowOfferModal(false);

        } catch (error) {
            console.error('❌ Error submitting offer:', error);
            alert('Failed to submit offer. Please try again.');
        } finally {
            setOfferSubmitting(false);
        }
    };

    const nextImage = () => {
        if (product?.images && product.images.length > 1) {
            setCurrentImageIndex((prev) =>
                prev === product.images.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (product?.images && product.images.length > 1) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? product.images.length - 1 : prev - 1
            );
        }
    };

    if (loading) {
        return (
            <div className="product-detail-loading">
                <div className="spinner"></div>
                <p>Loading product details...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="product-not-found">
                <h2>Product Not Found</h2>
                <p>The product you're looking for doesn't exist.</p>
                <button onClick={() => navigate('/marketplace')} className="back-btn">
                    ← Back to Marketplace
                </button>
            </div>
        );
    }

    const isOwnProduct = user && (user.uid === product.sellerId || user.uid === product.seller?.id);

    return (
        <div className="product-detail-container">
            <div className="product-detail-header">
                <button onClick={() => navigate('/marketplace')} className="back-btn">
                    ← Back to Marketplace
                </button>
            </div>

            <div className="product-detail-content">
                {/* Product Images */}
                <div className="product-images-section">
                    <div className="main-image-container">
                        {product.images && product.images.length > 0 ? (
                            <>
                                <img
                                    src={product.images[currentImageIndex]}
                                    alt={product.name}
                                    className="main-product-image"
                                />
                                {product.images.length > 1 && (
                                    <>
                                        <button className="image-nav prev" onClick={prevImage}>
                                            ‹
                                        </button>
                                        <button className="image-nav next" onClick={nextImage}>
                                            ›
                                        </button>
                                        <div className="image-indicators">
                                            {product.images.map((_, index) => (
                                                <span
                                                    key={index}
                                                    className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="no-image-large">
                                <span>📷</span>
                                <p>No Image Available</p>
                            </div>
                        )}
                    </div>

                    {/* Thumbnail Images */}
                    {product.images && product.images.length > 1 && (
                        <div className="thumbnail-container">
                            {product.images.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`${product.name} ${index + 1}`}
                                    className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentImageIndex(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Information */}
                <div className="product-info-section">
                    <h1 className="product-title">{product.name}</h1>

                    <div className="product-price-section">
                        <span className="product-price">RM {product.price.toFixed(2)}</span>
                        {product.category && (
                            <span className="product-category">{product.category}</span>
                        )}
                    </div>

                    {/* Seller Information */}
                    <div className="seller-info">
                        <h3>Seller Information</h3>
                        <p>
                            <strong>Name:</strong> {product.seller?.name || product.seller?.email || 'Anonymous Seller'}
                        </p>
                        {product.seller?.email && (
                            <p><strong>Contact:</strong> {product.seller.email}</p>
                        )}
                        <p><strong>Listed:</strong> {product.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                    </div>

                    {/* Product Description */}
                    <div className="product-description">
                        <h3>Description</h3>
                        <p>{product.description || 'No description provided.'}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="product-actions">
                        {!isOwnProduct ? (
                            <>
                                <div className="action-buttons">
                                    <AddToCart product={product} />
                                    <button
                                        className="make-offer-btn"
                                        onClick={() => setShowOfferModal(true)}
                                        disabled={!user}
                                    >
                                        💰 Make an Offer
                                    </button>
                                </div>
                                {!user && (
                                    <p className="login-notice">
                                        Please <a href="/login">login</a> to make offers or add to cart.
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="own-product-notice">
                                <p>📝 This is your product listing</p>
                                <button
                                    onClick={() => navigate(`/edit-listing/${product.id}`)}
                                    className="edit-product-btn"
                                >
                                    ✏️ Edit Listing
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Product Stats */}
                    <div className="product-stats">
                        <div className="stat">
                            <span className="stat-label">Product ID:</span>
                            <span className="stat-value">#{product.id.slice(-8)}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Category:</span>
                            <span className="stat-value">{product.category || 'Uncategorized'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Make Offer Modal */}
            {showOfferModal && (
                <MakeOffer
                    product={product}
                    onSubmit={handleOfferSubmit}
                    onClose={() => setShowOfferModal(false)}
                    isSubmitting={offerSubmitting}
                />
            )}
        </div>
    );
}

export default ProductDetail;
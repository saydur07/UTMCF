// src/components/Pages/Cart.js - Simplified to use CartContext
import React from 'react';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
    const {
        cart,
        removeFromCart,
        updateQuantity,
        acceptedOffers,
        removeAcceptedOffer,
        getRegularCartTotal,
        getAcceptedOffersTotal,
        getCartTotal,
        isCartEmpty,
        loading
    } = useCart();

    if (loading) {
        return (
            <div className="cart-container">
                <div className="loading-state">
                    <h2>🔄 Loading your cart...</h2>
                    <p>Checking for items and accepted offers...</p>
                </div>
            </div>
        );
    }

    if (isCartEmpty()) {
        return (
            <div className="cart-empty">
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <Link to="/marketplace" className="continue-shopping">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    const handleRemoveAcceptedOffer = async (offerId) => {
        try {
            await removeAcceptedOffer(offerId);
        } catch (error) {
            alert('Failed to remove offer. Please try again.');
        }
    };

    return (
        <div className="cart-container">
            <h2>Your Cart</h2>

            {/* Accepted Offers Section */}
            {acceptedOffers.length > 0 && (
                <div className="accepted-offers-section">
                    <h3>💰 Accepted Offers ({acceptedOffers.length})</h3>
                    <p className="offers-notice">
                        These offers have been accepted by sellers. Complete payment to secure your items!
                    </p>

                    {acceptedOffers.map(offer => (
                        <div key={offer.id} className="cart-item offer-item">
                            <div className="item-image">
                                {offer.productImage ? (
                                    <img src={offer.productImage} alt={offer.productName} />
                                ) : (
                                    <div className="placeholder-image">📦</div>
                                )}
                            </div>

                            <div className="item-details">
                                <h3>{offer.productName}</h3>
                                <div className="offer-pricing">
                                    <p className="original-price">
                                        Original: <span className="crossed-out">RM {offer.originalPrice?.toFixed(2)}</span>
                                    </p>
                                    <p className="offer-price">
                                        <strong>Accepted Offer: RM {offer.offerAmount?.toFixed(2)}</strong>
                                    </p>
                                    <p className="savings">
                                        💾 You save: RM {((offer.originalPrice || 0) - (offer.offerAmount || 0)).toFixed(2)}
                                    </p>
                                </div>
                                <p className="seller-info">Seller: {offer.sellerName}</p>
                                <p className="offer-status">✅ Offer Accepted - Ready for Payment</p>
                            </div>

                            <div className="item-quantity offer-quantity">
                                <span className="fixed-quantity">Qty: 1</span>
                                <small>(Fixed quantity for offers)</small>
                            </div>

                            <div className="item-total offer-total">
                                <span className="final-price">RM {offer.offerAmount?.toFixed(2)}</span>
                            </div>

                            <button
                                onClick={() => handleRemoveAcceptedOffer(offer.id)}
                                className="remove-btn offer-remove"
                                title="Remove this accepted offer"
                            >
                                Remove Offer
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Regular Cart Items Section */}
            {cart.length > 0 && (
                <div className="regular-cart-section">
                    <h3>🛒 Regular Items ({cart.length})</h3>

                    {cart.map(item => (
                        <div key={item.id} className="cart-item">
                            <div className="item-image">
                                {item.images && item.images.length > 0 ? (
                                    <img src={item.images[0]} alt={item.name} />
                                ) : (
                                    <div className="placeholder-image">📷</div>
                                )}
                            </div>

                            <div className="item-details">
                                <h3>{item.name}</h3>
                                <p>RM {item.price.toFixed(2)}</p>
                                {item.seller && (
                                    <p className="seller-info">Seller: {item.seller.name || item.seller.email}</p>
                                )}
                            </div>

                            <div className="item-quantity">
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="quantity-btn"
                                >
                                    -
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="quantity-btn"
                                >
                                    +
                                </button>
                            </div>

                            <div className="item-total">
                                RM {(item.price * item.quantity).toFixed(2)}
                            </div>

                            <button
                                onClick={() => removeFromCart(item.id)}
                                className="remove-btn"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Cart Summary */}
            <div className="cart-summary">
                {/* Breakdown */}
                <div className="cart-breakdown">
                    {cart.length > 0 && (
                        <div className="breakdown-row">
                            <span>Regular Items ({cart.length}):</span>
                            <span>RM {getRegularCartTotal().toFixed(2)}</span>
                        </div>
                    )}
                    {acceptedOffers.length > 0 && (
                        <div className="breakdown-row offer-row">
                            <span>Accepted Offers ({acceptedOffers.length}):</span>
                            <span>RM {getAcceptedOffersTotal().toFixed(2)}</span>
                        </div>
                    )}
                    <hr className="breakdown-divider" />
                </div>

                <div className="cart-total">
                    <span>Total Amount:</span>
                    <span className="total-price">RM {getCartTotal().toFixed(2)}</span>
                </div>

                {acceptedOffers.length > 0 && (
                    <div className="offers-notice-checkout">
                        <p>💡 <strong>Notice:</strong> Accepted offers must be paid at the agreed price.</p>
                    </div>
                )}

                <div className="cart-actions">
                    <Link to="/marketplace" className="continue-shopping">
                        Continue Shopping
                    </Link>
                    <Link
                        to="/checkout"
                        className="checkout-btn"
                    >
                        Proceed to Checkout ({cart.length + acceptedOffers.length} items)
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Cart;
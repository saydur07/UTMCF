// src/components/Pages/CheckoutOptions.js - Fixed to handle accepted offers
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import ProductQRPayment from '../Payment/ProductQRPayment';
import MeetupRequest from '../Payment/MeetupRequest';
import './CheckoutOptions.css';

const CheckoutOptions = () => {
    const {
        cart,
        acceptedOffers,
        getCartTotal,
        clearCart,
        isCartEmpty,
        loading
    } = useCart();

    const [paymentMethod, setPaymentMethod] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const navigate = useNavigate();
    const user = auth.currentUser;

    console.log('🔍 CheckoutOptions - Debug Info:');
    console.log('🔍 cart:', cart);
    console.log('🔍 acceptedOffers:', acceptedOffers);
    console.log('🔍 isCartEmpty():', isCartEmpty());
    console.log('🔍 loading:', loading);

    // Group both cart items AND accepted offers by seller
    const groupedBySeller = {};

    // Process regular cart items
    cart.forEach(item => {
        const sellerId = item.seller?.id || item.sellerId;
        const sellerInfo = item.seller || {
            id: item.sellerId,
            name: item.sellerName,
            email: item.sellerEmail
        };

        if (!groupedBySeller[sellerId]) {
            groupedBySeller[sellerId] = {
                seller: sellerInfo,
                items: [],
                offers: [],
                total: 0
            };
        }
        groupedBySeller[sellerId].items.push(item);
        groupedBySeller[sellerId].total += item.price * item.quantity;
    });

    // Process accepted offers
    acceptedOffers.forEach(offer => {
        const sellerId = offer.sellerId;
        const sellerInfo = {
            id: offer.sellerId,
            name: offer.sellerName,
            email: offer.sellerEmail
        };

        if (!groupedBySeller[sellerId]) {
            groupedBySeller[sellerId] = {
                seller: sellerInfo,
                items: [],
                offers: [],
                total: 0
            };
        }
        groupedBySeller[sellerId].offers.push(offer);
        groupedBySeller[sellerId].total += offer.offerAmount || 0;
    });

    const sellers = Object.values(groupedBySeller);

    console.log('🔍 CheckoutOptions - Processed Sellers:', sellers);

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handlePaymentMethodSelect = (method, seller) => {
        if (!user) {
            alert('Please login to proceed with checkout');
            navigate('/login');
            return;
        }

        setPaymentMethod(method);
        setSelectedSeller(seller);
    };

    const handleOrderSuccess = () => {
        console.log('Order created successfully!');
        alert('Order placed successfully! You can track it in your orders page.');

        // Clear cart after successful order
        clearCart();

        // Navigate to orders page to see the new order
        navigate('/orders');
    };

    const handleBack = () => {
        setPaymentMethod(null);
        setSelectedSeller(null);
    };

    if (loading) {
        return (
            <div className="checkout-container">
                <div className="loading-state">
                    <h2>🔄 Loading Checkout...</h2>
                    <p>Preparing your order...</p>
                </div>
            </div>
        );
    }

    if (isCartEmpty()) {
        return (
            <div className="checkout-container">
                <h2>Your cart is empty</h2>
                <div className="debug-info">
                    <p>Cart items: {cart.length}</p>
                    <p>Accepted offers: {acceptedOffers.length}</p>
                </div>
                <button onClick={() => navigate('/marketplace')} className="continue-shopping-btn">
                    Continue Shopping
                </button>
            </div>
        );
    }

    // Show payment method selection
    if (!paymentMethod) {
        return (
            <div className="checkout-container">
                <div className="checkout-header">
                    <h1>Checkout</h1>
                    <button onClick={() => navigate('/cart')} className="back-to-cart">
                        ← Back to Cart
                    </button>
                </div>

                <div className="checkout-content">
                    {sellers.length === 1 ? (
                        // Single seller - direct payment options
                        <div className="single-seller-checkout">
                            <div className="order-summary">
                                <h2>Order Summary</h2>
                                <div className="seller-section">
                                    <h3>Seller: {sellers[0].seller.name || sellers[0].seller.email}</h3>

                                    {/* Regular Items */}
                                    {sellers[0].items.length > 0 && (
                                        <div className="items-section">
                                            <h4 className="section-title">🛒 Regular Items ({sellers[0].items.length})</h4>
                                            <div className="items-list">
                                                {sellers[0].items.map(item => (
                                                    <div key={item.id} className="checkout-item">
                                                        <img src={item.images?.[0]} alt={item.name} className="item-image" />
                                                        <div className="item-details">
                                                            <h4>{item.name}</h4>
                                                            <p>{formatCurrency(item.price)} × {item.quantity}</p>
                                                        </div>
                                                        <div className="item-total">
                                                            {formatCurrency(item.price * item.quantity)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Accepted Offers */}
                                    {sellers[0].offers.length > 0 && (
                                        <div className="offers-section">
                                            <h4 className="section-title">💰 Accepted Offers ({sellers[0].offers.length})</h4>
                                            <div className="items-list">
                                                {sellers[0].offers.map(offer => (
                                                    <div key={offer.id} className="checkout-item offer-item">
                                                        <img src={offer.productImage} alt={offer.productName} className="item-image" />
                                                        <div className="item-details">
                                                            <h4>{offer.productName}</h4>
                                                            <p className="offer-details">
                                                                <span className="original-price">Was: {formatCurrency(offer.originalPrice)}</span>
                                                                <br />
                                                                <span className="offer-price">Offer: {formatCurrency(offer.offerAmount)}</span>
                                                            </p>
                                                            <p className="savings">
                                                                💾 You save: {formatCurrency((offer.originalPrice || 0) - (offer.offerAmount || 0))}
                                                            </p>
                                                        </div>
                                                        <div className="item-total offer-total">
                                                            {formatCurrency(offer.offerAmount)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="seller-total">
                                        Total: {formatCurrency(sellers[0].total)}
                                    </div>
                                </div>
                            </div>

                            <div className="payment-options">
                                <h2>Choose Payment Method</h2>
                                <div className="payment-buttons">
                                    <button
                                        className="payment-option qr-payment"
                                        onClick={() => handlePaymentMethodSelect('qr', sellers[0])}
                                    >
                                        <div className="payment-icon">💳</div>
                                        <div className="payment-info">
                                            <h3>QR Payment</h3>
                                            <p>Pay instantly using bank QR code</p>
                                        </div>
                                    </button>

                                    <button
                                        className="payment-option meetup-payment"
                                        onClick={() => handlePaymentMethodSelect('meetup', sellers[0])}
                                    >
                                        <div className="payment-icon">🤝</div>
                                        <div className="payment-info">
                                            <h3>Meetup & Pay</h3>
                                            <p>Arrange meetup with seller</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Multiple sellers - choose seller first
                        <div className="multiple-seller-checkout">
                            <div className="checkout-notice">
                                <h2>Multiple Sellers Detected</h2>
                                <p>Your cart contains items from different sellers. Please checkout with each seller separately.</p>
                            </div>

                            {sellers.map((sellerGroup, index) => (
                                <div key={sellerGroup.seller.id} className="seller-checkout-section">
                                    <div className="seller-header">
                                        <h3>Seller: {sellerGroup.seller.name || sellerGroup.seller.email}</h3>
                                        <div className="seller-total">
                                            Total: {formatCurrency(sellerGroup.total)}
                                        </div>
                                    </div>

                                    <div className="seller-items">
                                        {/* Regular Items */}
                                        {sellerGroup.items.map(item => (
                                            <div key={item.id} className="checkout-item">
                                                <img src={item.images?.[0]} alt={item.name} className="item-image" />
                                                <div className="item-details">
                                                    <h4>{item.name}</h4>
                                                    <p>{formatCurrency(item.price)} × {item.quantity}</p>
                                                </div>
                                                <div className="item-total">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Accepted Offers */}
                                        {sellerGroup.offers.map(offer => (
                                            <div key={offer.id} className="checkout-item offer-item">
                                                <img src={offer.productImage} alt={offer.productName} className="item-image" />
                                                <div className="item-details">
                                                    <h4>{offer.productName}</h4>
                                                    <p className="offer-details">
                                                        <span className="offer-badge">💰 Accepted Offer</span>
                                                        <br />
                                                        <span className="offer-price">{formatCurrency(offer.offerAmount)}</span>
                                                    </p>
                                                </div>
                                                <div className="item-total offer-total">
                                                    {formatCurrency(offer.offerAmount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="seller-payment-options">
                                        <button
                                            className="payment-option-small qr-payment"
                                            onClick={() => handlePaymentMethodSelect('qr', sellerGroup)}
                                        >
                                            💳 QR Payment
                                        </button>
                                        <button
                                            className="payment-option-small meetup-payment"
                                            onClick={() => handlePaymentMethodSelect('meetup', sellerGroup)}
                                        >
                                            🤝 Meetup
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Show selected payment method component
    return (
        <div className="checkout-container">
            {paymentMethod === 'qr' && (
                <ProductQRPayment
                    sellerGroup={selectedSeller}
                    onSuccess={handleOrderSuccess}
                    onBack={handleBack}
                    onCancel={() => navigate('/cart')}
                />
            )}

            {paymentMethod === 'meetup' && (
                <MeetupRequest
                    sellerGroup={selectedSeller}
                    onSuccess={handleOrderSuccess}
                    onBack={handleBack}
                    onCancel={() => navigate('/cart')}
                />
            )}
        </div>
    );
};

export default CheckoutOptions;
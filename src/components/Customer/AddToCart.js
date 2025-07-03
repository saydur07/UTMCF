// src/components/Customer/AddToCart.js - Fixed to structure cart items properly
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import './AddToCart.css';

const AddToCart = ({ product }) => {
    const { addToCart } = useCart();
    const [showNotification, setShowNotification] = useState(false);

    const handleAddToCart = () => {
        // Structure cart item properly for downstream components
        const cartItem = {
            // Product information
            id: product.id,
            productId: product.id,  // Add productId for ProductQRPayment to fetch QR codes
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            images: product.images || [],

            // Seller information - flatten for easier access
            sellerId: product.seller?.id,
            sellerName: product.seller?.name || product.seller?.email || 'Unknown Seller',
            sellerEmail: product.seller?.email,

            // Keep original seller object for backward compatibility
            seller: product.seller,

            // Cart-specific fields
            quantity: 1,
            addedAt: new Date(),

            // Product metadata
            createdAt: product.createdAt,
            status: product.status
        };

        console.log('📦 Adding structured cart item:', cartItem);
        addToCart(cartItem);
        setShowNotification(true);

        // Hide notification after 3 seconds
        setTimeout(() => {
            setShowNotification(false);
        }, 3000);
    };

    return (
        <div className="add-to-cart-container">
            <button
                className="add-to-cart-btn"
                onClick={handleAddToCart}
            >
                Add to Cart
            </button>

            {showNotification && (
                <div className="cart-notification">
                    Item added to cart successfully!
                </div>
            )}
        </div>
    );
};

export default AddToCart;
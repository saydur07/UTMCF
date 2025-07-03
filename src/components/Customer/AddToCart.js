// src/components/Customer/AddToCart.js
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import './AddToCart.css';

const AddToCart = ({ product }) => {
    const { addToCart } = useCart();
    const [showNotification, setShowNotification] = useState(false);

    const handleAddToCart = () => {
        addToCart(product);
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
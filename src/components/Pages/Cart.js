// src/components/Pages/Cart.js
import React from 'react';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();

    // Log the cart contents for debugging
    console.log('Cart contents:', cart);

    if (cart.length === 0) {
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

    return (
        <div className="cart-container">
            <h2>Your Cart</h2>

            <div className="cart-items">
                {cart.map(item => (
                    <div key={item.id} className="cart-item">
                        <div className="item-image">
                            {item.images && item.images.length > 0 ? (
                                <img src={item.images[0]} alt={item.name} />
                            ) : (
                                <div className="placeholder-image">No Image</div>
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

            <div className="cart-summary">
                <div className="cart-total">
                    <span>Total:</span>
                    <span>RM {getCartTotal().toFixed(2)}</span>
                </div>

                <div className="cart-actions">
                    <Link to="/marketplace" className="continue-shopping">
                        Continue Shopping
                    </Link>
                    <Link to="/checkout" className="checkout-btn">
                        Proceed to Checkout
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Cart;
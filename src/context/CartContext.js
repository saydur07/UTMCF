// src/context/CartContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    // Initialize cart from localStorage if available
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('cart');
        const parsedCart = savedCart ? JSON.parse(savedCart) : [];
        console.log('Initial cart from localStorage:', parsedCart);
        return parsedCart;
    });

    // Store cart in localStorage whenever it changes
    useEffect(() => {
        console.log('Cart updated, new state:', cart);
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    // Add item to cart
    const addToCart = (item) => {
        console.log('Adding item to cart:', item);

        // Validate item has required fields
        if (!item || !item.id) {
            console.error('Cannot add item without an id:', item);
            return;
        }

        setCart(prevCart => {
            // Check if item already exists in cart
            const existingItem = prevCart.find(cartItem => cartItem.id === item.id);

            if (existingItem) {
                console.log('Item already exists in cart, updating quantity');
                // Increase quantity if item exists
                return prevCart.map(cartItem =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            } else {
                console.log('Adding new item to cart with quantity 1');
                // Add new item with quantity 1
                return [...prevCart, { ...item, quantity: 1 }];
            }
        });
    };

    // Remove item from cart
    const removeFromCart = (itemId) => {
        console.log('Removing item from cart:', itemId);
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    };

    // Update item quantity
    const updateQuantity = (itemId, quantity) => {
        console.log('Updating quantity for item:', itemId, 'new quantity:', quantity);
        if (quantity <= 0) {
            removeFromCart(itemId);
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.id === itemId ? { ...item, quantity } : item
            )
        );
    };

    // Clear cart
    const clearCart = () => {
        console.log('Clearing cart');
        setCart([]);
    };

    // Get total number of items in cart
    const getCartCount = () => {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        console.log('Cart count:', count);
        return count;
    };

    // Get total price of items in cart
    const getCartTotal = () => {
        const total = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        console.log('Cart total:', total);
        return total;
    };

    const value = {
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
        getCartTotal
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
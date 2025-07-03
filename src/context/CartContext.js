// src/context/CartContext.js - FIXED VERSION with correct total calculation
import React, { createContext, useState, useContext, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [acceptedOffers, setAcceptedOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Monitor auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
            console.log('🔐 CartContext Auth state changed:', authUser?.email || 'No user');
            setUser(authUser);

            if (!authUser) {
                setAcceptedOffers([]);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('utmcf-cart');
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                setCart(parsedCart);
                console.log('📦 Cart loaded from localStorage:', parsedCart.length, 'items');
            } catch (error) {
                console.error('❌ Error parsing saved cart:', error);
                localStorage.removeItem('utmcf-cart');
            }
        }
    }, []);

    // Save cart to localStorage whenever cart changes
    useEffect(() => {
        localStorage.setItem('utmcf-cart', JSON.stringify(cart));
        console.log('💾 Cart saved to localStorage:', cart.length, 'items');
    }, [cart]);

    // Listen for accepted offers when user changes
    useEffect(() => {
        if (!user?.uid) {
            console.log('💬 No user - clearing accepted offers');
            setAcceptedOffers([]);
            setLoading(false);
            return;
        }

        console.log('🔍 Setting up accepted offers listener for user:', user.uid);
        setLoading(true);

        // Query for accepted offers where user is the buyer
        const offersQuery = query(
            collection(db, 'orders'),
            where('buyerId', '==', user.uid),
            where('type', '==', 'offer'),
            where('status', '==', 'offer_accepted')
        );

        const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
            const offers = [];
            snapshot.forEach((doc) => {
                const offerData = { id: doc.id, ...doc.data() };
                console.log('✅ Found accepted offer in CartContext:', offerData);
                offers.push(offerData);
            });

            console.log('💰 Total accepted offers in CartContext:', offers.length);
            setAcceptedOffers(offers);
            setLoading(false);
        }, (error) => {
            console.error('❌ Error listening to accepted offers:', error);
            setLoading(false);
        });

        return unsubscribe;
    }, [user?.uid]);

    const addToCart = (item) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.id === item.id);

            if (existingItem) {
                // Update quantity if item already exists
                const updatedCart = prevCart.map(cartItem =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + (item.quantity || 1) }
                        : cartItem
                );
                console.log('✅ Updated existing item in cart:', item.name);
                return updatedCart;
            } else {
                // Add new item to cart
                const newCart = [...prevCart, { ...item, quantity: item.quantity || 1 }];
                console.log('✅ Added new item to cart:', item.name);
                return newCart;
            }
        });
    };

    const removeFromCart = (itemId) => {
        setCart(prevCart => {
            const updatedCart = prevCart.filter(item => item.id !== itemId);
            console.log('🗑️ Item removed from cart, ID:', itemId);
            return updatedCart;
        });
    };

    const updateQuantity = (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(itemId);
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.id === itemId
                    ? { ...item, quantity: newQuantity }
                    : item
            )
        );
        console.log('🔄 Cart quantity updated for item:', itemId, 'New quantity:', newQuantity);
    };

    const clearCart = () => {
        setCart([]);
        localStorage.removeItem('utmcf-cart');
        console.log('🧹 Cart cleared');
    };

    // Remove accepted offer (mark as removed from cart)
    const removeAcceptedOffer = async (offerId) => {
        try {
            await updateDoc(doc(db, 'orders', offerId), {
                status: 'offer_removed_from_cart',
                removedFromCartAt: new Date()
            });
            console.log('🗑️ Removed accepted offer from cart');
        } catch (error) {
            console.error('❌ Error removing accepted offer:', error);
            throw error;
        }
    };

    // Get total number of items in cart (including offers)
    const getCartCount = () => {
        const cartCount = cart.reduce((total, item) => total + (item.quantity || 0), 0);
        const offersCount = acceptedOffers.length;
        return cartCount + offersCount;
    };

    // Get regular cart total (without offers) - SEPARATE CALCULATION
    const getRegularCartTotal = () => {
        const total = cart.reduce((total, item) => {
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 0;
            return total + (itemPrice * itemQuantity);
        }, 0);

        console.log('🧮 Regular cart total calculated:', total);
        return total;
    };

    // Get accepted offers total - SEPARATE CALCULATION
    const getAcceptedOffersTotal = () => {
        const total = acceptedOffers.reduce((total, offer) => {
            const offerAmount = parseFloat(offer.offerAmount) || 0;
            console.log('🧮 Processing offer:', offer.productName, 'Amount:', offerAmount);
            return total + offerAmount;
        }, 0);

        console.log('🧮 Accepted offers total calculated:', total);
        return total;
    };

    //  Main function to calculate total price (cart + offers) - FIXED
    const getTotalPrice = () => {
        const cartTotal = getRegularCartTotal();
        const offersTotal = getAcceptedOffersTotal();
        const combinedTotal = cartTotal + offersTotal;

        console.log('🧮 TOTAL CALCULATION BREAKDOWN:');
        console.log('🧮 - Regular cart total:', cartTotal);
        console.log('🧮 - Accepted offers total:', offersTotal);
        console.log('🧮 - Combined total:', combinedTotal);

        return combinedTotal;
    };

    //  Alias for getTotalPrice - FIXED
    const getCartTotal = () => {
        console.log('🧮 getCartTotal called - calculating total...');
        const total = getTotalPrice();
        console.log('💰 Final cart total (including offers):', total);
        return total;
    };

    // Get formatted total price
    const getFormattedTotal = () => {
        const total = getTotalPrice();
        return `RM ${total.toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    //  Check if cart is empty (including offers)
    const isCartEmpty = () => {
        return cart.length === 0 && acceptedOffers.length === 0;
    };

    // Get cart summary with all info
    const getCartSummary = () => {
        const totalItems = getCartCount();
        const totalPrice = getTotalPrice();
        const uniqueItems = cart.length;
        const regularTotal = getRegularCartTotal();
        const offersTotal = getAcceptedOffersTotal();

        return {
            totalItems,
            totalPrice,
            uniqueItems,
            regularTotal,
            offersTotal,
            acceptedOffersCount: acceptedOffers.length,
            formattedTotal: getFormattedTotal(),
            isEmpty: isCartEmpty(),
            items: cart,
            acceptedOffers
        };
    };

    // Get item by ID
    const getCartItem = (itemId) => {
        return cart.find(item => item.id === itemId);
    };

    // Check if item exists in cart
    const isInCart = (itemId) => {
        return cart.some(item => item.id === itemId);
    };

    // Get quantity of specific item
    const getItemQuantity = (itemId) => {
        const item = getCartItem(itemId);
        return item ? item.quantity : 0;
    };

    // Update item details (price, name, etc.)
    const updateCartItem = (itemId, updates) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.id === itemId
                    ? { ...item, ...updates }
                    : item
            )
        );
        console.log('🔄 Cart item updated:', itemId, updates);
    };

    // Get subtotal for specific item
    const getItemSubtotal = (itemId) => {
        const item = getCartItem(itemId);
        if (!item) return 0;
        return parseFloat(item.price || 0) * parseInt(item.quantity || 0);
    };

    // Get items grouped by seller (including offers)
    const getItemsBySeller = () => {
        const sellerGroups = {};

        // Process regular cart items
        cart.forEach(item => {
            const sellerId = item.sellerId || 'unknown';
            if (!sellerGroups[sellerId]) {
                sellerGroups[sellerId] = {
                    sellerId,
                    sellerName: item.sellerName || 'Unknown Seller',
                    sellerEmail: item.sellerEmail || '',
                    items: [],
                    offers: [],
                    totalAmount: 0,
                    itemCount: 0,
                    offerCount: 0
                };
            }

            sellerGroups[sellerId].items.push(item);
            sellerGroups[sellerId].totalAmount += parseFloat(item.price || 0) * parseInt(item.quantity || 0);
            sellerGroups[sellerId].itemCount += parseInt(item.quantity || 0);
        });

        // Process accepted offers
        acceptedOffers.forEach(offer => {
            const sellerId = offer.sellerId || 'unknown';
            if (!sellerGroups[sellerId]) {
                sellerGroups[sellerId] = {
                    sellerId,
                    sellerName: offer.sellerName || 'Unknown Seller',
                    sellerEmail: offer.sellerEmail || '',
                    items: [],
                    offers: [],
                    totalAmount: 0,
                    itemCount: 0,
                    offerCount: 0
                };
            }

            sellerGroups[sellerId].offers.push(offer);
            sellerGroups[sellerId].totalAmount += offer.offerAmount || 0;
            sellerGroups[sellerId].offerCount += 1;
        });

        return sellerGroups;
    };

    // Calculate tax (if needed)
    const calculateTax = (taxRate = 0.06) => {
        return getTotalPrice() * taxRate;
    };

    // Calculate grand total with tax
    const getGrandTotal = (taxRate = 0.06) => {
        const subtotal = getTotalPrice();
        const tax = calculateTax(taxRate);
        return subtotal + tax;
    };

    // Export all functions with clear separation
    const value = {
        // State
        cart,
        acceptedOffers,
        loading,

        // Basic operations
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        removeAcceptedOffer,

        // Getters - CLEAR SEPARATION BETWEEN REGULAR AND COMBINED TOTALS
        getCartCount,           // Combined count (cart + offers)
        getTotalPrice,          // 🎯 COMBINED total (cart + offers)
        getCartTotal,          // 🎯 COMBINED total (cart + offers) - alias for getTotalPrice
        getRegularCartTotal,   // 🛒 ONLY regular cart items
        getAcceptedOffersTotal, // 💰 ONLY accepted offers
        getFormattedTotal,     // Formatted combined total
        isCartEmpty,           // Checks both cart and offers
        getCartSummary,
        getCartItem,
        isInCart,
        getItemQuantity,
        getItemSubtotal,
        getItemsBySeller,      // Groups both items and offers by seller

        // Advanced operations
        updateCartItem,
        calculateTax,
        getGrandTotal
    };

    // Debug: Log all available functions
    console.log('🛒 CartContext available functions:', Object.keys(value).filter(key => typeof value[key] === 'function'));

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
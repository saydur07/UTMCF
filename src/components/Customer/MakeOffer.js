// src/components/Customer/MakeOffer.js
import React, { useState } from 'react';
import './MakeOffer.css';

function MakeOffer({ product, onSubmit, onClose, isSubmitting }) {
    const [offerAmount, setOfferAmount] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});

    const validateOffer = () => {
        const newErrors = {};
        const amount = parseFloat(offerAmount);
        const originalPrice = parseFloat(product.price);

        if (!offerAmount || isNaN(amount)) {
            newErrors.amount = 'Please enter a valid offer amount';
        } else if (amount <= 0) {
            newErrors.amount = 'Offer amount must be greater than 0';
        } else if (amount > originalPrice) {
            newErrors.amount = 'Offer amount cannot exceed the original price';
        } else if (amount < originalPrice * 0.1) {
            newErrors.amount = 'Offer amount seems too low (minimum 10% of original price)';
        }

        if (message.length > 500) {
            newErrors.message = 'Message cannot exceed 500 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateOffer()) {
            return;
        }

        onSubmit({
            amount: parseFloat(offerAmount),
            message: message.trim()
        });
    };

    const calculateSavings = () => {
        const amount = parseFloat(offerAmount);
        const originalPrice = parseFloat(product.price);

        if (isNaN(amount) || amount >= originalPrice) return null;

        const savings = originalPrice - amount;
        const percentage = ((savings / originalPrice) * 100).toFixed(1);

        return { savings, percentage };
    };

    const getSuggestedOffers = () => {
        const originalPrice = parseFloat(product.price);
        return [
            { label: '90%', amount: (originalPrice * 0.9).toFixed(2) },
            { label: '80%', amount: (originalPrice * 0.8).toFixed(2) },
            { label: '70%', amount: (originalPrice * 0.7).toFixed(2) },
        ];
    };

    const savings = calculateSavings();
    const suggestedOffers = getSuggestedOffers();

    return (
        <div className="offer-modal-overlay" onClick={onClose}>
            <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
                <div className="offer-modal-header">
                    <h2>💰 Make an Offer</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="offer-modal-content">
                    {/* Product Summary */}
                    <div className="product-summary">
                        <div className="product-image-small">
                            {product.images && product.images[0] ? (
                                <img src={product.images[0]} alt={product.name} />
                            ) : (
                                <div className="no-image">📷</div>
                            )}
                        </div>
                        <div className="product-details">
                            <h3>{product.name}</h3>
                            <p className="original-price">Original Price: <strong>RM {product.price.toFixed(2)}</strong></p>
                            <p className="seller-name">Seller: {product.seller?.name || product.seller?.email}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="offer-form">
                        {/* Offer Amount */}
                        <div className="form-group">
                            <label htmlFor="offerAmount">Your Offer Amount (RM)</label>
                            <div className="amount-input-container">
                                <span className="currency-symbol"></span>
                                <input
                                    type="number"
                                    id="offerAmount"
                                    value={offerAmount}
                                    onChange={(e) => setOfferAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    max={product.price}
                                    className={errors.amount ? 'error' : ''}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {errors.amount && <span className="error-text">{errors.amount}</span>}

                            {/* Savings Display */}
                            {savings && (
                                <div className="savings-display">
                                    <span className="savings-text">
                                        💡 You'll save RM {savings.savings.toFixed(2)} ({savings.percentage}%)
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Quick Offer Suggestions */}
                        <div className="suggested-offers">
                            <label>Quick Offers:</label>
                            <div className="suggestion-buttons">
                                {suggestedOffers.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="suggestion-btn"
                                        onClick={() => setOfferAmount(suggestion.amount)}
                                        disabled={isSubmitting}
                                    >
                                        {suggestion.label}
                                        <span>RM {suggestion.amount}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="form-group">
                            <label htmlFor="message">Message (Optional)</label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a message to your offer (e.g., reason for the offer, pickup preferences, etc.)"
                                rows={4}
                                maxLength={500}
                                className={errors.message ? 'error' : ''}
                                disabled={isSubmitting}
                            />
                            <div className="character-count">
                                {message.length}/500 characters
                            </div>
                            {errors.message && <span className="error-text">{errors.message}</span>}
                        </div>

                        {/* Offer Terms */}
                        <div className="offer-terms">
                            <h4>📋 Offer Terms:</h4>
                            <ul>
                                <li>Your offer is valid for 7 days</li>
                                <li>The seller can accept, reject, or counter your offer</li>
                                <li>You'll be notified via chat of the seller's response</li>
                                <li>If accepted, you can proceed with payment</li>
                                <li>Offers are binding once accepted by the seller</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="form-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="submit-offer-btn"
                                disabled={isSubmitting || !offerAmount}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Submitting Offer...
                                    </>
                                ) : (
                                    <>
                                        💰 Submit Offer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default MakeOffer;
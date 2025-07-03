// src/components/Payment/MeetupRequest.js
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import './MeetupRequest.css';

const MeetupRequest = ({ sellerGroup, onSuccess, onBack, onCancel, onError }) => {
    const [formData, setFormData] = useState({
        buyerName: auth.currentUser?.displayName || '',
        buyerEmail: auth.currentUser?.email || '',
        buyerPhone: '',
        preferredLocation: '',
        preferredDate: '',
        preferredTime: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.buyerName.trim()) {
            newErrors.buyerName = 'Name is required';
        }

        if (!formData.buyerEmail.trim()) {
            newErrors.buyerEmail = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.buyerEmail)) {
            newErrors.buyerEmail = 'Invalid email format';
        }

        if (!formData.buyerPhone.trim()) {
            newErrors.buyerPhone = 'Phone number is required';
        }

        if (!formData.preferredLocation.trim()) {
            newErrors.preferredLocation = 'Preferred location is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getMinDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            console.log('❌ Form validation failed:', errors);
            return;
        }

        if (!auth.currentUser) {
            alert('You must be logged in to create an order');
            return;
        }

        if (!sellerGroup || !sellerGroup.seller || !sellerGroup.items) {
            console.error('❌ Invalid seller group data:', sellerGroup);
            alert('Invalid order data. Please try again.');
            return;
        }

        try {
            setLoading(true);

            console.log('🤝 Creating meetup order...');
            console.log('📦 Seller group:', sellerGroup);
            console.log('👤 Current user:', auth.currentUser.uid);

            // Validate all required fields
            const requiredFields = {
                buyerId: auth.currentUser.uid,
                buyerEmail: auth.currentUser.email,
                sellerId: sellerGroup.seller.id,
                sellerEmail: sellerGroup.seller.email,
                items: sellerGroup.items,
                totalAmount: sellerGroup.total
            };

            // Check if any required field is missing
            for (const [key, value] of Object.entries(requiredFields)) {
                if (!value || (Array.isArray(value) && value.length === 0)) {
                    throw new Error(`Missing required field: ${key}`);
                }
            }

            const orderData = {
                // Buyer information
                buyerId: auth.currentUser.uid,
                buyerEmail: auth.currentUser.email,
                buyerName: formData.buyerName.trim(),
                buyerPhone: formData.buyerPhone.trim(),

                // Seller information
                sellerId: sellerGroup.seller.id,
                sellerEmail: sellerGroup.seller.email,
                sellerName: sellerGroup.seller.name || sellerGroup.seller.email,

                // Order items
                items: sellerGroup.items.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity),
                    image: item.images?.[0] || '',
                    total: parseFloat(item.price) * parseInt(item.quantity)
                })),

                // Order totals
                totalAmount: parseFloat(sellerGroup.total),

                // Payment method
                paymentMethod: 'meetup',

                // Meetup details
                meetupDetails: {
                    preferredLocation: formData.preferredLocation.trim(),
                    preferredDate: formData.preferredDate || null,
                    preferredTime: formData.preferredTime || null,
                    buyerNotes: formData.notes.trim() || null,
                    status: 'requested' // requested -> confirmed -> completed
                },

                // Order status
                status: 'pending_meetup',

                // Timestamps
                createdAt: new Date(),
                lastUpdated: new Date(),

                // Initial message
                messages: [
                    {
                        senderId: auth.currentUser.uid,
                        senderName: formData.buyerName.trim(),
                        senderType: 'buyer',
                        message: `Hi! I'd like to arrange a meetup for the items in my order. 
📍 Location: ${formData.preferredLocation.trim()}${formData.preferredDate ? '\n📅 Date: ' + formData.preferredDate : ''}${formData.preferredTime ? '\n⏰ Time: ' + formData.preferredTime : ''}${formData.notes.trim() ? '\n💬 Notes: ' + formData.notes.trim() : ''}

Please confirm if this works for you or suggest an alternative. Thanks!`,
                        timestamp: new Date(),
                        read: false
                    }
                ]
            };

            console.log('📄 Order data to be created:', orderData);

            // Create order in Firestore
            const orderRef = await addDoc(collection(db, 'orders'), orderData);
            console.log('✅ Meetup order created successfully with ID:', orderRef.id);

            // Notify parent component of success
            setLoading(false);

            if (onSuccess) {
                onSuccess();
            } else {
                alert('Meetup request submitted successfully!');
            }

        } catch (error) {
            console.error('❌ Error creating meetup order:', error);
            setLoading(false);

            let errorMessage = 'Failed to submit meetup request. Please try again.';

            if (error.message.includes('Missing required field')) {
                errorMessage = 'Some required information is missing. Please refresh and try again.';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'You don\'t have permission to create orders. Please login again.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            }

            if (onError) {
                onError(error);
            } else {
                alert(errorMessage);
            }
        }
    };

    return (
        <div className="meetup-request">
            <div className="meetup-header">
                <h2>🤝 Arrange Meetup</h2>
                <button onClick={onBack} className="back-button">
                    ← Back to Payment Options
                </button>
            </div>

            <div className="meetup-content">
                {/* Order Summary */}
                <div className="order-summary-section">
                    <h3>📋 Order Summary</h3>
                    <div className="seller-info">
                        <h4>🏪 Seller: {sellerGroup.seller.name || sellerGroup.seller.email}</h4>
                        <p className="seller-contact">📧 Contact: {sellerGroup.seller.email}</p>
                    </div>
                    <div className="items-list">
                        {sellerGroup.items.map(item => (
                            <div key={item.id} className="order-item">
                                <img src={item.images[0]} alt={item.name} className="item-image" />
                                <div className="item-details">
                                    <h5>{item.name}</h5>
                                    <p>{formatCurrency(item.price)} × {item.quantity}</p>
                                </div>
                                <div className="item-total">
                                    {formatCurrency(item.price * item.quantity)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="order-total">
                        <strong>💰 Total to pay at meetup: {formatCurrency(sellerGroup.total)}</strong>
                    </div>
                </div>

                {/* Meetup Form */}
                <form onSubmit={handleSubmit} className="meetup-form">
                    <h3>📝 Meetup Details</h3>

                    <div className="form-section">
                        <h4>👤 Your Contact Information</h4>

                        <div className="form-group">
                            <label htmlFor="buyerName">Full Name *</label>
                            <input
                                type="text"
                                id="buyerName"
                                name="buyerName"
                                value={formData.buyerName}
                                onChange={handleInputChange}
                                className={errors.buyerName ? 'error' : ''}
                                placeholder="Enter your full name"
                                disabled={loading}
                                required
                            />
                            {errors.buyerName && <span className="error-message">{errors.buyerName}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="buyerEmail">Email Address *</label>
                                <input
                                    type="email"
                                    id="buyerEmail"
                                    name="buyerEmail"
                                    value={formData.buyerEmail}
                                    onChange={handleInputChange}
                                    className={errors.buyerEmail ? 'error' : ''}
                                    placeholder="Enter your email"
                                    disabled={loading}
                                    required
                                />
                                {errors.buyerEmail && <span className="error-message">{errors.buyerEmail}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="buyerPhone">Phone Number *</label>
                                <input
                                    type="tel"
                                    id="buyerPhone"
                                    name="buyerPhone"
                                    value={formData.buyerPhone}
                                    onChange={handleInputChange}
                                    className={errors.buyerPhone ? 'error' : ''}
                                    placeholder="e.g., +60123456789"
                                    disabled={loading}
                                    required
                                />
                                {errors.buyerPhone && <span className="error-message">{errors.buyerPhone}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>📍 Meetup Preferences</h4>

                        <div className="form-group">
                            <label htmlFor="preferredLocation">Preferred Meetup Location *</label>
                            <input
                                type="text"
                                id="preferredLocation"
                                name="preferredLocation"
                                value={formData.preferredLocation}
                                onChange={handleInputChange}
                                className={errors.preferredLocation ? 'error' : ''}
                                placeholder="e.g., UTM Library, KSL Mall, etc."
                                disabled={loading}
                                required
                            />
                            {errors.preferredLocation && <span className="error-message">{errors.preferredLocation}</span>}
                            <small className="help-text">
                                🏢 Suggest a convenient public location for both parties
                            </small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="preferredDate">Preferred Date</label>
                                <input
                                    type="date"
                                    id="preferredDate"
                                    name="preferredDate"
                                    value={formData.preferredDate}
                                    onChange={handleInputChange}
                                    min={getMinDate()}
                                    disabled={loading}
                                />
                                <small className="help-text">📅 Optional - you can discuss this in chat</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="preferredTime">Preferred Time</label>
                                <input
                                    type="time"
                                    id="preferredTime"
                                    name="preferredTime"
                                    value={formData.preferredTime}
                                    onChange={handleInputChange}
                                    disabled={loading}
                                />
                                <small className="help-text">⏰ Optional - you can discuss this in chat</small>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Additional Notes</label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            placeholder="Any additional information or special requests..."
                            rows="3"
                            disabled={loading}
                        />
                        <small className="help-text">💬 Optional - any special requirements or preferences</small>
                    </div>

                    <div className="meetup-notice">
                        <div className="notice-content">
                            <h4>🔄 How it works:</h4>
                            <ol>
                                <li>🚀 Submit your meetup request with preferred details</li>
                                <li>📱 The seller will be notified and can message you to confirm</li>
                                <li>💬 Arrange the final meetup details through the messaging system</li>
                                <li>🤝 Meet at the agreed location and complete the transaction in cash</li>
                                <li>✅ Seller will mark the order as completed after successful meetup</li>
                            </ol>
                            <div className="safety-notice">
                                <strong>🛡️ Safety Tips:</strong>
                                <ul>
                                    <li>Meet in public, well-lit locations</li>
                                    <li>Bring exact change if possible</li>
                                    <li>Inspect items before payment</li>
                                    <li>Trust your instincts - cancel if something feels wrong</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="cancel-button"
                            disabled={loading}
                        >
                            ❌ Cancel
                        </button>
                        <button
                            type="submit"
                            className="submit-button"
                            disabled={loading || !formData.buyerName.trim() || !formData.buyerEmail.trim() || !formData.buyerPhone.trim() || !formData.preferredLocation.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="loading-spinner">⏳</span>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    🚀 Submit Meetup Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeetupRequest;
// src/components/Payment/StripePaymentForm.js
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../../firebase';
// import './StripePaymentForm.css';

// Replace with your Stripe publishable key
const stripePromise = loadStripe('pk_test_51RTSKl04broK5tvDQwkufdZlRtzE89atm9ShX2MvrD8lXRJAhvTOGGexlDvhlZKEfRoqveYqsddKywC0BZV5DS5500hpLQf2KB');

const PaymentForm = ({
    campaignId,
    campaignTitle,
    onPaymentSuccess,
    onPaymentError,
    onCancel
}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [amount, setAmount] = useState('');
    const [donorName, setDonorName] = useState('');
    const [donorEmail, setDonorEmail] = useState('');
    const [message, setMessage] = useState('');
    const user = auth.currentUser;

    // Pre-fill form with user data if logged in
    useEffect(() => {
        if (user) {
            setDonorName(user.displayName || '');
            setDonorEmail(user.email || '');
        }
    }, [user]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid donation amount');
            return;
        }

        if (!donorName || !donorEmail) {
            setError('Please fill in your name and email');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Convert amount to cents for Stripe (RM to sen)
            const amountInCents = Math.round(parseFloat(amount) * 100);

            console.log('Payment submission:');
            console.log('- Original amount:', amount);
            console.log('- Parsed amount:', parseFloat(amount));
            console.log('- Amount in cents:', amountInCents);
            console.log('- Campaign ID:', campaignId);

            // Create payment intent on server
            const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
            const result = await createPaymentIntent({
                amount: amountInCents,
                currency: 'myr',
                campaignId,
                donorName,
                donorEmail,
                message: message || ''
            });

            console.log('Payment intent result:', result.data);
            const { clientSecret } = result.data;

            if (!clientSecret) {
                throw new Error('No client secret received from server');
            }

            // Confirm payment with Stripe
            const cardElement = elements.getElement(CardElement);
            console.log('Confirming payment with Stripe...');

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: donorName,
                            email: donorEmail,
                        },
                    },
                }
            );

            if (stripeError) {
                console.error('Stripe error:', stripeError);
                setError(stripeError.message);
                setLoading(false);
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                console.log('Payment succeeded, recording donation...');

                // Payment successful - now record donation manually
                try {
                    const recordDonation = httpsCallable(functions, 'recordDonation');
                    await recordDonation({
                        paymentIntentId: paymentIntent.id,
                        campaignId,
                        amount: parseFloat(amount), // Original amount, not cents
                        donorName,
                        donorEmail,
                        message: message || ''
                    });

                    console.log('Donation recorded successfully');

                    // Payment and recording successful
                    onPaymentSuccess({
                        paymentIntentId: paymentIntent.id,
                        amount: parseFloat(amount),
                        donorName,
                        donorEmail,
                        message: message || ''
                    });
                } catch (recordError) {
                    console.error('Error recording donation:', recordError);

                    // Payment succeeded but recording failed - still show success
                    onPaymentSuccess({
                        paymentIntentId: paymentIntent.id,
                        amount: parseFloat(amount),
                        donorName,
                        donorEmail,
                        message: message || ''
                    });
                }
            } else {
                console.error('Unexpected payment status:', paymentIntent?.status);
                setError('Payment failed. Please try again.');
                setLoading(false);
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError(error.message || 'Payment failed. Please try again.');
            setLoading(false);
            if (onPaymentError) {
                onPaymentError(error);
            }
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#9e2146',
            },
        },
        hidePostalCode: true,
    };

    return (
        <div className="stripe-payment-form">
            <div className="payment-header">
                <h3>Donate to "{campaignTitle}"</h3>
                <p>Your donation helps make a difference</p>
            </div>

            {error && (
                <div className="payment-error">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="payment-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="amount">Donation Amount (RM) *</label>
                        <input
                            type="number"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="1"
                            step="0.01"
                            placeholder="50"
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="donorName">Full Name *</label>
                        <input
                            type="text"
                            id="donorName"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            placeholder="Your full name"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="donorEmail">Email Address *</label>
                        <input
                            type="email"
                            id="donorEmail"
                            value={donorEmail}
                            onChange={(e) => setDonorEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="message">Message (Optional)</label>
                    <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Leave an encouraging message..."
                        rows="3"
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label>Card Details *</label>
                    <div className="card-element-container">
                        <CardElement options={cardElementOptions} />
                    </div>
                    <p className="card-help-text">
                        Your payment information is secure and encrypted
                    </p>
                </div>

                <div className="payment-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cancel-payment-btn"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="donate-payment-btn"
                        disabled={!stripe || loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading-spinner"></span>
                                Processing...
                            </>
                        ) : (
                            `Donate RM ${amount || '0'}`
                        )}
                    </button>
                </div>
            </form>

            <div className="payment-security">
                <div className="security-badges">
                    <div className="security-badge">
                        <span>🔒</span>
                        <span>SSL Encrypted</span>
                    </div>
                    <div className="security-badge">
                        <span>💳</span>
                        <span>Stripe Secure</span>
                    </div>
                    <div className="security-badge">
                        <span>🛡️</span>
                        <span>PCI Compliant</span>
                    </div>
                </div>
                <p className="security-text">
                    Powered by Stripe. Your card information is never stored on our servers.
                </p>
            </div>
        </div>
    );
};

// const StripePaymentForm = (props) => {
//     return (
//         <Elements stripe={stripePromise}>
//             <PaymentForm {...props} />
//         </Elements>
//     );
// };

export default StripePaymentForm;
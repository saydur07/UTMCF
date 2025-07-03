// src/components/Pages/CampaignDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useCampaign } from '../../context/CampaignContext';
import StripePaymentForm from '../Payment/StripePaymentForm';
import PaymentSuccess from '../Payment/PaymentSuccess';
import './CampaignDetails.css';

function CampaignDetails() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [error, setError] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const user = auth.currentUser;
    const { addDonation, getCampaignProgress, isCampaignGoalReached, getDaysRemaining } = useCampaign();

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'campaigns', campaignId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCampaign({
                        id: docSnap.id,
                        ...docSnap.data()
                    });
                } else {
                    setError('Campaign not found');
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching campaign:', error);
                setError('Error loading campaign');
                setLoading(false);
            }
        };

        if (campaignId) {
            fetchCampaign();
        }
    }, [campaignId]);

    const handlePaymentSuccess = async (paymentInfo) => {
        // Update local campaign state immediately for better UX
        setCampaign(prevCampaign => ({
            ...prevCampaign,
            currentAmount: prevCampaign.currentAmount + paymentInfo.amount,
            donationCount: prevCampaign.donationCount + 1
        }));

        // Store payment data for success modal
        setPaymentData(paymentInfo);
        setShowPaymentForm(false);
        setShowPaymentSuccess(true);
    };

    const handlePaymentError = (error) => {
        console.error('Payment error:', error);
        setError('Payment failed. Please try again.');
    };

    const handleClosePaymentSuccess = () => {
        setShowPaymentSuccess(false);
        setPaymentData(null);
    };

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date) => {
        if (!date) return 'No end date';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const nextImage = () => {
        if (campaign && campaign.images) {
            setCurrentImageIndex((prev) =>
                prev === campaign.images.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (campaign && campaign.images) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? campaign.images.length - 1 : prev - 1
            );
        }
    };

    if (loading) {
        return <div className="loading">Loading campaign...</div>;
    }

    if (error && !campaign) {
        return (
            <div className="error-container">
                <h2>Campaign Not Found</h2>
                <p>{error}</p>
                <Link to="/fundraising" className="back-link">
                    ← Back to Fundraising
                </Link>
            </div>
        );
    }

    if (!campaign) {
        return null;
    }

    const progress = getCampaignProgress(campaign);
    const goalReached = isCampaignGoalReached(campaign);
    const daysRemaining = getDaysRemaining(campaign);
    const isCreator = user && user.uid === campaign.creator.id;

    return (
        <div className="campaign-details-container">
            <div className="campaign-header">
                <Link to="/fundraising" className="back-link">
                    ← Back to Fundraising
                </Link>

                {isCreator && (
                    <div className="creator-actions">
                        <Link to={`/edit-campaign/${campaign.id}`} className="edit-campaign-btn">
                            Edit Campaign
                        </Link>
                    </div>
                )}
            </div>

            <div className="campaign-content">
                <div className="campaign-main">
                    <div className="campaign-images">
                        {campaign.images && campaign.images.length > 0 ? (
                            <div className="image-gallery">
                                <img
                                    src={campaign.images[currentImageIndex]}
                                    alt={campaign.title}
                                    className="main-image"
                                />
                                {campaign.images.length > 1 && (
                                    <>
                                        <button className="nav-btn prev-btn" onClick={prevImage}>
                                            ‹
                                        </button>
                                        <button className="nav-btn next-btn" onClick={nextImage}>
                                            ›
                                        </button>
                                        <div className="image-indicators">
                                            {campaign.images.map((_, index) => (
                                                <button
                                                    key={index}
                                                    className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="no-image-large">No Image Available</div>
                        )}
                    </div>

                    <div className="campaign-info">
                        <div className="campaign-category">
                            {campaign.category && (
                                <span className="category-tag">
                                    {campaign.category.charAt(0).toUpperCase() + campaign.category.slice(1)}
                                </span>
                            )}
                        </div>

                        <h1>{campaign.title}</h1>

                        <div className="campaign-creator-info">
                            <span>Created by <strong>{campaign.creator.name || campaign.creator.email}</strong></span>
                            <span className="creation-date">on {formatDate(campaign.createdAt)}</span>
                        </div>

                        <div className="campaign-description">
                            <p>{campaign.description}</p>
                        </div>
                    </div>
                </div>

                <div className="campaign-sidebar">
                    <div className="donation-card">
                        <div className="amount-raised">
                            <h2>{formatCurrency(campaign.currentAmount)}</h2>
                            <p>raised of {formatCurrency(campaign.goalAmount)} goal</p>
                        </div>

                        <div className="progress-section">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="progress-stats">
                                <span>{campaign.donationCount || 0} donors</span>
                                <span>{progress.toFixed(1)}% funded</span>
                            </div>
                        </div>

                        {goalReached && (
                            <div className="goal-reached-message">
                                🎉 Goal Reached! Thank you to all donors!
                            </div>
                        )}

                        {daysRemaining !== null && (
                            <div className="time-remaining">
                                {daysRemaining > 0 ? (
                                    <><strong>{daysRemaining}</strong> days remaining</>
                                ) : (
                                    <span className="campaign-ended">Campaign ended</span>
                                )}
                            </div>
                        )}

                        {campaign.endDate && (
                            <div className="end-date">
                                Campaign ends on {formatDate(campaign.endDate)}
                            </div>
                        )}

                        {!isCreator && campaign.status === 'active' && (
                            <div className="donation-actions">
                                {!showPaymentForm ? (
                                    <button
                                        className="donate-btn-large"
                                        onClick={() => setShowPaymentForm(true)}
                                    >
                                        Donate Now with Stripe
                                    </button>
                                ) : (
                                    <StripePaymentForm
                                        campaignId={campaign.id}
                                        campaignTitle={campaign.title}
                                        onPaymentSuccess={handlePaymentSuccess}
                                        onPaymentError={handlePaymentError}
                                        onCancel={() => setShowPaymentForm(false)}
                                    />
                                )}
                            </div>
                        )}

                        {isCreator && (
                            <div className="creator-info">
                                <p>This is your campaign</p>
                                <Link to="/my-campaigns" className="manage-link">
                                    Manage Campaigns
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Success Modal */}
            {showPaymentSuccess && paymentData && (
                <PaymentSuccess
                    paymentData={paymentData}
                    campaignTitle={campaign.title}
                    campaignId={campaign.id}
                    onClose={handleClosePaymentSuccess}
                />
            )}
        </div>
    );
}

export default CampaignDetails;
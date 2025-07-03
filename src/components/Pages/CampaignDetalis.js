// src/components/Pages/CampaignDetails.js - Updated to use new payment system
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useCampaign } from '../../context/CampaignContext';
import CampaignQRPayment from '../Payment/CampaignQRPayment'; // ✅ New component
import CampaignPaymentSuccess from '../Payment/CampaignPaymentSuccess'; // ✅ New component
import './CampaignDetails.css';

function CampaignDetails() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQRPayment, setShowQRPayment] = useState(false);
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

    const handleDonateClick = () => {
        if (!user) {
            alert('Please login to donate');
            return;
        }

        // Check if campaign has QR codes
        const validQRCodes = campaign.qrCodes?.filter(qr => qr.imageUrl && qr.bankName) || [];
        if (validQRCodes.length === 0) {
            alert('Payment methods are not available for this campaign yet.');
            return;
        }

        setShowQRPayment(true);
    };

    // ✅ Updated success handler for new payment system
    const handlePaymentSuccess = async (paymentInfo) => {
        console.log('🎉 Donation payment success:', paymentInfo);

        // Note: Don't update campaign amounts here since donation is pending verification
        // The campaign creator will verify and approve the donation

        // Store payment data for success modal
        setPaymentData(paymentInfo);
        setShowQRPayment(false);
        setShowPaymentSuccess(true);
    };

    const handleClosePaymentSuccess = () => {
        setShowPaymentSuccess(false);
        setPaymentData(null);
        // Refresh campaign data to get latest donation info
        window.location.reload();
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
    const daysRemaining = getDaysRemaining(campaign);
    const isCreator = user && user.uid === campaign.creator.id;
    const hasValidQRCodes = campaign.qrCodes?.some(qr => qr.imageUrl && qr.bankName);

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

                        {/* ✅ Updated donations display - Show verified donations only */}
                        {campaign.donations && campaign.donations.length > 0 && (
                            <div className="recent-donations">
                                <h3>Recent Donations</h3>
                                <div className="donations-list">
                                    {campaign.donations
                                        .filter(donation => donation.status === 'confirmed' || donation.status === 'verified')
                                        .slice(0, 5)
                                        .map((donation, index) => (
                                            <div key={index} className="donation-item">
                                                <div className="donation-info">
                                                    <strong>{donation.donorName}</strong>
                                                    <span className="donation-amount">{formatCurrency(donation.amount)}</span>
                                                </div>
                                                {donation.message && (
                                                    <p className="donation-message">"{donation.message}"</p>
                                                )}
                                                <div className="donation-timestamp">
                                                    {formatDate(donation.timestamp)}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {/* ✅ Show pending donations for campaign creator */}
                                {isCreator && (
                                    <div className="pending-donations">
                                        <h4>⏳ Pending Verification</h4>
                                        <p>
                                            {campaign.donations.filter(d => d.status === 'pending_verification').length}
                                            donation(s) waiting for your verification
                                        </p>
                                        <small>Check your messages to verify donations</small>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="campaign-sidebar">
                    <div className="donation-card">
                        <div className="goal-amount">
                            <h2>Goal: {formatCurrency(campaign.goalAmount)}</h2>
                            <p>Help us reach our target</p>
                        </div>

                        {/* ✅ Updated progress display */}
                        <div className="progress-section">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="progress-stats">
                                <div className="stat">
                                    <span className="stat-value">{formatCurrency(campaign.currentAmount || 0)}</span>
                                    <span className="stat-label">raised</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{campaign.donationCount || 0}</span>
                                    <span className="stat-label">donations</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{progress.toFixed(1)}%</span>
                                    <span className="stat-label">funded</span>
                                </div>
                            </div>
                        </div>

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

                        {/* ✅ Updated donation button */}
                        {!isCreator && campaign.status === 'active' && (
                            <div className="donation-actions">
                                {hasValidQRCodes ? (
                                    <button
                                        className="donate-btn-large"
                                        onClick={handleDonateClick}
                                    >
                                        💝 Donate Now
                                    </button>
                                ) : (
                                    <div className="no-payment-methods">
                                        <p>Payment methods not yet available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {isCreator && (
                            <div className="creator-info">
                                <p>This is your campaign</p>
                                <Link to="/my-campaigns" className="manage-link">
                                    Manage Campaigns
                                </Link>
                                {!hasValidQRCodes && (
                                    <div className="payment-setup-warning">
                                        <p><strong>⚠️ Setup payment methods</strong></p>
                                        <p>Add QR codes to receive donations</p>
                                        <Link to={`/edit-campaign/${campaign.id}`} className="setup-payment-btn">
                                            Add Payment Methods
                                        </Link>
                                    </div>
                                )}

                                {/* ✅ Quick access to messages for pending donations */}
                                <div className="creator-messages">
                                    <h4>📧 Donation Messages</h4>
                                    <p>Check your messages for donation receipts to verify</p>
                                    <button
                                        className="open-messages-btn"
                                        onClick={() => {
                                            // This will be handled by the chat system
                                            console.log('Opening messages for donation verification');
                                        }}
                                    >
                                        💬 Open Messages
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ Updated QR Payment Modal */}
            {showQRPayment && (
                <CampaignQRPayment
                    campaign={campaign}
                    onClose={() => setShowQRPayment(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}

            {/* ✅ Updated Payment Success Modal */}
            {showPaymentSuccess && paymentData && (
                <CampaignPaymentSuccess
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
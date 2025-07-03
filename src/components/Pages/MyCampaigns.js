// src/components/Pages/MyCampaigns.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useCampaign } from '../../context/CampaignContext';
import './MyCampaigns.css';

function MyCampaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const user = auth.currentUser;
    const { getCampaignProgress, isCampaignGoalReached, getDaysRemaining } = useCampaign();

    useEffect(() => {
        console.log('MyCampaigns component mounted, user:', user?.uid);
        const fetchMyCampaigns = async () => {
            if (!user) {
                console.log('No user found, skipping fetch');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                console.log('Fetching campaigns for user:', user.uid);

                // Remove orderBy temporarily to debug
                const q = query(
                    collection(db, 'campaigns'),
                    where('creator.id', '==', user.uid)
                );
                const querySnapshot = await getDocs(q);

                const campaignList = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('User campaign fetched:', { id: doc.id, ...data });
                    campaignList.push({
                        id: doc.id,
                        ...data
                    });
                });

                console.log('Total user campaigns:', campaignList.length);

                // Sort manually
                campaignList.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return dateB - dateA;
                });

                setCampaigns(campaignList);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching campaigns: ", error);
                setLoading(false);
            }
        };

        fetchMyCampaigns();
    }, [user]);

    const toggleCampaignStatus = async (campaignId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'active' ? 'paused' : 'active';
            const campaignRef = doc(db, 'campaigns', campaignId);

            await updateDoc(campaignRef, {
                status: newStatus,
                updatedAt: new Date()
            });

            // Update local state
            setCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? { ...campaign, status: newStatus }
                        : campaign
                )
            );

            console.log(`Campaign ${campaignId} status changed to ${newStatus}`);
        } catch (error) {
            console.error('Error updating campaign status:', error);
            alert('Failed to update campaign status. Please try again.');
        }
    };

    const filteredCampaigns = campaigns.filter(campaign => {
        if (filter === 'all') return true;
        if (filter === 'active') return campaign.status === 'active';
        if (filter === 'paused') return campaign.status === 'paused';
        if (filter === 'completed') return isCampaignGoalReached(campaign);
        return true;
    });

    const formatDate = (date) => {
        if (!date) return 'No end date';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!user) {
        return (
            <div className="my-campaigns-container">
                <div className="not-logged-in">
                    <h2>Please log in to view your campaigns</h2>
                    <Link to="/login" className="login-link">Go to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="my-campaigns-container">
            <div className="campaigns-header">
                <h1>My Campaigns</h1>
                <Link to="/create-campaign" className="create-campaign-btn">
                    Create New Campaign
                </Link>
            </div>

            <div className="campaigns-filter">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Campaigns</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Goal Reached</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading your campaigns...</div>
            ) : (
                <>
                    {filteredCampaigns.length > 0 ? (
                        <div className="campaigns-grid">
                            {filteredCampaigns.map(campaign => {
                                const progress = getCampaignProgress(campaign);
                                const goalReached = isCampaignGoalReached(campaign);
                                const daysRemaining = getDaysRemaining(campaign);

                                return (
                                    <div key={campaign.id} className={`campaign-card ${campaign.status}`}>
                                        <div className="campaign-image">
                                            {campaign.images && campaign.images.length > 0 ? (
                                                <img src={campaign.images[0]} alt={campaign.title} />
                                            ) : (
                                                <div className="no-image">No Image</div>
                                            )}
                                            <div className={`status-badge ${campaign.status}`}>
                                                {campaign.status}
                                            </div>
                                        </div>

                                        <div className="campaign-info">
                                            <h3>{campaign.title}</h3>
                                            <p className="campaign-description">
                                                {campaign.description.length > 100
                                                    ? campaign.description.substring(0, 100) + '...'
                                                    : campaign.description}
                                            </p>

                                            <div className="progress-section">
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progress-text">
                                                    <span className="current-amount">
                                                        {formatCurrency(campaign.currentAmount)}
                                                    </span>
                                                    <span className="goal-amount">
                                                        of {formatCurrency(campaign.goalAmount)}
                                                    </span>
                                                </div>
                                                <div className="campaign-stats">
                                                    <span>{campaign.donationCount || 0} donations</span>
                                                    <span>{progress.toFixed(1)}% funded</span>
                                                </div>
                                            </div>

                                            {goalReached && (
                                                <div className="goal-reached">
                                                    🎉 Goal Reached!
                                                </div>
                                            )}

                                            {daysRemaining !== null && (
                                                <div className="days-remaining">
                                                    {daysRemaining > 0
                                                        ? `${daysRemaining} days left`
                                                        : 'Campaign ended'
                                                    }
                                                </div>
                                            )}

                                            <div className="campaign-actions">
                                                <Link
                                                    to={`/campaign/${campaign.id}`}
                                                    className="view-btn"
                                                >
                                                    View Details
                                                </Link>
                                                <Link
                                                    to={`/edit-campaign/${campaign.id}`}
                                                    className="edit-btn"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                                                    className={`toggle-btn ${campaign.status === 'active' ? 'pause' : 'resume'}`}
                                                >
                                                    {campaign.status === 'active' ? 'Pause' : 'Resume'}
                                                </button>
                                            </div>

                                            <div className="campaign-meta">
                                                <small>Created: {formatDate(campaign.createdAt)}</small>
                                                {campaign.endDate && (
                                                    <small>Ends: {formatDate(campaign.endDate)}</small>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="no-campaigns">
                            <div className="no-campaigns-content">
                                <h3>No campaigns found</h3>
                                <p>
                                    {filter === 'all'
                                        ? "You haven't created any campaigns yet."
                                        : `No ${filter} campaigns found.`
                                    }
                                </p>
                                <Link to="/create-campaign" className="create-first-campaign">
                                    Create Your First Campaign
                                </Link>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default MyCampaigns;
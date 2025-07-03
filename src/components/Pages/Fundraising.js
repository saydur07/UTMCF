// src/components/Pages/Fundraising.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCampaign } from '../../context/CampaignContext';
import './Fundraising.css';

function Fundraising() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const user = auth.currentUser;
    const { getCampaignProgress, isCampaignGoalReached, getDaysRemaining } = useCampaign();

    const fetchCampaigns = async () => {
        try {
            setLoading(true);

            // Simple query without orderBy to avoid index issues
            const q = query(
                collection(db, "campaigns"),
                where("status", "==", "active")
            );
            const querySnapshot = await getDocs(q);

            const campaignList = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                campaignList.push({
                    id: doc.id,
                    ...data
                });
            });

            // Sort by createdAt manually
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

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleRefresh = async () => {
        await fetchCampaigns();
    };

    const filteredCampaigns = campaigns.filter(campaign => {
        // Filter by category if not 'all'
        const categoryMatch = filter === 'all' || campaign.category === filter;

        // Search term filter
        const searchMatch = !searchTerm ||
            campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (campaign.description && campaign.description.toLowerCase().includes(searchTerm.toLowerCase()));

        return categoryMatch && searchMatch;
    });

    // Get unique categories for filter dropdown
    const categories = ['all', ...new Set(campaigns.map(campaign => campaign.category).filter(Boolean))];

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date) => {
        if (!date) return null;
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString();
    };

    return (
        <div className="fundraising-container">
            <div className="fundraising-header">
                <h1>Fundraising Campaigns</h1>
                <p>Support meaningful causes and help make a difference in our community</p>
            </div>

            <div className="fundraising-actions">
                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="filter-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category === 'all' ? 'All Categories' :
                                    category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {user && (
                    <Link to="/create-campaign" className="create-campaign-btn">
                        Start a Campaign
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="loading">Loading campaigns...</div>
            ) : (
                <>
                    {filteredCampaigns.length > 0 ? (
                        <div className="campaigns-grid">
                            {filteredCampaigns.map(campaign => {
                                // Calculate progress safely without context
                                const currentAmount = campaign.currentAmount || 0;
                                const goalAmount = campaign.goalAmount || 1;
                                const progress = Math.min((currentAmount / goalAmount) * 100, 100);
                                const goalReached = currentAmount >= goalAmount;

                                // Calculate days remaining safely
                                let daysRemaining = null;
                                if (campaign.endDate) {
                                    const endDate = campaign.endDate.toDate ? campaign.endDate.toDate() : new Date(campaign.endDate);
                                    const today = new Date();
                                    const diffTime = endDate - today;
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    daysRemaining = diffDays > 0 ? diffDays : 0;
                                }

                                return (
                                    <div key={campaign.id} className="campaign-card">
                                        <div className="campaign-image">
                                            {campaign.images && campaign.images.length > 0 ? (
                                                <img src={campaign.images[0]} alt={campaign.title} />
                                            ) : (
                                                <div className="no-image">No Image</div>
                                            )}
                                            {goalReached && (
                                                <div className="goal-reached-badge">
                                                    Goal Reached!
                                                </div>
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

                                            <h3>{campaign.title}</h3>
                                            <p className="campaign-description">
                                                {campaign.description.length > 120
                                                    ? campaign.description.substring(0, 120) + '...'
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
                                                        {formatCurrency(campaign.currentAmount || 0)}
                                                    </span>
                                                    <span className="goal-amount">
                                                        of {formatCurrency(campaign.goalAmount)}
                                                    </span>
                                                </div>
                                                <div className="campaign-stats">
                                                    <span>{campaign.donationCount || 0} donors</span>
                                                    <span>{progress.toFixed(1)}% funded</span>
                                                    {daysRemaining !== null && (
                                                        <span>
                                                            {daysRemaining > 0
                                                                ? `${daysRemaining} days left`
                                                                : 'Ended'
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="campaign-creator">
                                                <span>by {campaign.creator?.name || campaign.creator?.email || 'Anonymous'}</span>
                                            </div>

                                            <div className="campaign-actions">
                                                <Link
                                                    to={`/campaign/${campaign.id}`}
                                                    className="donate-btn"
                                                >
                                                    View & Donate
                                                </Link>
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
                                    {searchTerm
                                        ? `No campaigns match "${searchTerm}"`
                                        : filter === 'all'
                                            ? "No active campaigns at the moment."
                                            : `No campaigns found in the ${filter} category.`
                                    }
                                </p>
                                {user && (
                                    <Link to="/create-campaign" className="create-first-campaign">
                                        Start the First Campaign
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Fundraising;
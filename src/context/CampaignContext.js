// src/context/CampaignContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

const CampaignContext = createContext();

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider = ({ children }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [userCampaigns, setUserCampaigns] = useState([]);
    const [userDonations, setUserDonations] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch all active campaigns
    const fetchAllCampaigns = async () => {
        try {
            setLoading(true);
            // Remove orderBy to avoid index issues
            const q = query(
                collection(db, 'campaigns'),
                where('status', '==', 'active')
            );
            const querySnapshot = await getDocs(q);

            const campaignList = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Context - Fetched campaign:', data); // Debug log
                campaignList.push({
                    id: doc.id,
                    ...data
                });
            });

            // Sort manually
            campaignList.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });

            setCampaigns(campaignList);
            console.log('Context - Total campaigns set:', campaignList.length);
            setLoading(false);
            return campaignList;
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setLoading(false);
            return [];
        }
    };

    // Fetch user's campaigns
    const fetchUserCampaigns = async (userId) => {
        if (!userId) return [];

        try {
            setLoading(true);
            // Remove orderBy to avoid index issues
            const q = query(
                collection(db, 'campaigns'),
                where('creator.id', '==', userId)
            );
            const querySnapshot = await getDocs(q);

            const campaignList = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Context - User campaign:', data); // Debug log
                campaignList.push({
                    id: doc.id,
                    ...data
                });
            });

            // Sort manually
            campaignList.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });

            setUserCampaigns(campaignList);
            console.log('Context - User campaigns set:', campaignList.length);
            setLoading(false);
            return campaignList;
        } catch (error) {
            console.error('Error fetching user campaigns:', error);
            setLoading(false);
            return [];
        }
    };

    // Fetch user's donations across all campaigns
    const fetchUserDonations = async (userId) => {
        if (!userId) return [];

        try {
            const allCampaigns = await getDocs(collection(db, 'campaigns'));
            const donations = [];

            allCampaigns.docs.forEach(doc => {
                const campaignData = { id: doc.id, ...doc.data() };
                if (campaignData.donations) {
                    campaignData.donations.forEach(donation => {
                        if (donation.donorId === userId) {
                            donations.push({
                                ...donation,
                                campaignId: campaignData.id,
                                campaignTitle: campaignData.title
                            });
                        }
                    });
                }
            });

            // Sort by timestamp (newest first)
            donations.sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
                return dateB - dateA;
            });

            setUserDonations(donations);
            return donations;
        } catch (error) {
            console.error('Error fetching user donations:', error);
            return [];
        }
    };

    // Add donation to campaign (updated for QR payments)
    const addDonation = async (campaignId, donationAmount, donorInfo) => {
        try {
            const campaignRef = doc(db, 'campaigns', campaignId);

            // Create donation data
            const donationData = {
                amount: donationAmount,
                donorName: donorInfo.donorName,
                donorEmail: donorInfo.donorEmail,
                donorId: donorInfo.donorId || null,
                referenceNumber: donorInfo.referenceNumber || '',
                message: donorInfo.message || '',
                paymentMethod: 'qr_scan',
                bankDetails: donorInfo.bankDetails,
                status: 'pending',
                timestamp: new Date()
            };

            // Update campaign with new donation
            await updateDoc(campaignRef, {
                donations: arrayUnion(donationData),
                currentAmount: increment(donationAmount),
                donationCount: increment(1),
                lastDonation: new Date()
            });

            // Update local state
            setCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? {
                            ...campaign,
                            currentAmount: campaign.currentAmount + donationAmount,
                            donationCount: campaign.donationCount + 1,
                            lastDonation: new Date(),
                            donations: [...(campaign.donations || []), donationData]
                        }
                        : campaign
                )
            );

            // Update user campaigns if it's user's campaign
            setUserCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? {
                            ...campaign,
                            currentAmount: campaign.currentAmount + donationAmount,
                            donationCount: campaign.donationCount + 1,
                            lastDonation: new Date(),
                            donations: [...(campaign.donations || []), donationData]
                        }
                        : campaign
                )
            );

            // Add to user donations if it's the current user
            if (donorInfo.donorId === auth.currentUser?.uid) {
                const campaign = campaigns.find(c => c.id === campaignId);
                setUserDonations(prev => [{
                    ...donationData,
                    campaignId,
                    campaignTitle: campaign?.title
                }, ...prev]);
            }

            console.log('Donation added successfully:', donationAmount);
            return { success: true, donationData };
        } catch (error) {
            console.error('Error adding donation:', error);
            return { success: false, error: error.message };
        }
    };

    // Update donation status (for campaign creators to verify payments)
    const updateDonationStatus = async (campaignId, donationIndex, newStatus) => {
        try {
            const campaign = campaigns.find(c => c.id === campaignId);
            if (!campaign || !campaign.donations || !campaign.donations[donationIndex]) {
                throw new Error('Donation not found');
            }

            const updatedDonations = [...campaign.donations];
            updatedDonations[donationIndex] = {
                ...updatedDonations[donationIndex],
                status: newStatus,
                verifiedAt: new Date()
            };

            const campaignRef = doc(db, 'campaigns', campaignId);
            await updateDoc(campaignRef, {
                donations: updatedDonations
            });

            // Update local state
            setCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? { ...campaign, donations: updatedDonations }
                        : campaign
                )
            );

            setUserCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? { ...campaign, donations: updatedDonations }
                        : campaign
                )
            );

            return { success: true };
        } catch (error) {
            console.error('Error updating donation status:', error);
            return { success: false, error: error.message };
        }
    };

    // Update QR codes for a campaign
    const updateCampaignQRCodes = async (campaignId, qrCodes) => {
        try {
            const campaignRef = doc(db, 'campaigns', campaignId);
            await updateDoc(campaignRef, {
                qrCodes: qrCodes
            });

            // Update local state
            setCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? { ...campaign, qrCodes }
                        : campaign
                )
            );

            setUserCampaigns(prevCampaigns =>
                prevCampaigns.map(campaign =>
                    campaign.id === campaignId
                        ? { ...campaign, qrCodes }
                        : campaign
                )
            );

            return { success: true };
        } catch (error) {
            console.error('Error updating QR codes:', error);
            return { success: false, error: error.message };
        }
    };

    // Get campaign progress percentage
    const getCampaignProgress = (campaign) => {
        if (!campaign.goalAmount || campaign.goalAmount === 0) return 0;
        return Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100);
    };

    // Check if campaign goal is reached
    const isCampaignGoalReached = (campaign) => {
        return campaign.currentAmount >= campaign.goalAmount;
    };

    // Get days remaining for campaign
    const getDaysRemaining = (campaign) => {
        if (!campaign.endDate) return null;

        const endDate = campaign.endDate.toDate ? campaign.endDate.toDate() : new Date(campaign.endDate);
        const today = new Date();
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    };

    // Filter campaigns by category
    const getCampaignsByCategory = (category) => {
        if (!category || category === 'all') return campaigns;
        return campaigns.filter(campaign => campaign.category === category);
    };

    // Search campaigns
    const searchCampaigns = (searchTerm) => {
        if (!searchTerm) return campaigns;
        const term = searchTerm.toLowerCase();
        return campaigns.filter(campaign =>
            campaign.title.toLowerCase().includes(term) ||
            campaign.description.toLowerCase().includes(term) ||
            campaign.category.toLowerCase().includes(term)
        );
    };

    // Auto-fetch campaigns when context loads
    useEffect(() => {
        fetchAllCampaigns();
    }, []);

    // Auto-fetch user campaigns when user changes
    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            fetchUserCampaigns(user.uid);
            fetchUserDonations(user.uid);
        } else {
            setUserCampaigns([]);
            setUserDonations([]);
        }
    }, [auth.currentUser]);

    const value = {
        campaigns,
        userCampaigns,
        userDonations,
        loading,
        fetchAllCampaigns,
        fetchUserCampaigns,
        fetchUserDonations,
        addDonation,
        updateDonationStatus,
        updateCampaignQRCodes,
        getCampaignProgress,
        isCampaignGoalReached,
        getDaysRemaining,
        getCampaignsByCategory,
        searchCampaigns
    };

    return (
        <CampaignContext.Provider value={value}>
            {children}
        </CampaignContext.Provider>
    );
};
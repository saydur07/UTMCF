// src/context/CampaignContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, increment } from 'firebase/firestore';

const CampaignContext = createContext();

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider = ({ children }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [userCampaigns, setUserCampaigns] = useState([]);
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

    // Add donation to campaign
    const addDonation = async (campaignId, donationAmount, donorInfo) => {
        try {
            const campaignRef = doc(db, 'campaigns', campaignId);

            // Update campaign with new donation
            await updateDoc(campaignRef, {
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
                            lastDonation: new Date()
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
                            lastDonation: new Date()
                        }
                        : campaign
                )
            );

            console.log('Donation added successfully:', donationAmount);
            return true;
        } catch (error) {
            console.error('Error adding donation:', error);
            return false;
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

    // Auto-fetch campaigns when context loads
    useEffect(() => {
        fetchAllCampaigns();
    }, []);

    // Auto-fetch user campaigns when user changes
    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            fetchUserCampaigns(user.uid);
        } else {
            setUserCampaigns([]);
        }
    }, [auth.currentUser]);

    const value = {
        campaigns,
        userCampaigns,
        loading,
        fetchAllCampaigns,
        fetchUserCampaigns,
        addDonation,
        getCampaignProgress,
        isCampaignGoalReached,
        getDaysRemaining
    };

    return (
        <CampaignContext.Provider value={value}>
            {children}
        </CampaignContext.Provider>
    );
};
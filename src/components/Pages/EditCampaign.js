// src/components/Pages/EditCampaign.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useCampaign } from '../../context/CampaignContext';
import QRUpload from '../Payment/QRUpload';
import './EditCampaign.css';

function EditCampaign() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const { updateCampaignQRCodes } = useCampaign();

    const [campaign, setCampaign] = useState(null);
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCampaignData();
    }, [campaignId]);

    const fetchCampaignData = async () => {
        try {
            setLoading(true);
            const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));

            if (campaignDoc.exists()) {
                const data = campaignDoc.data();

                // Check if user is the owner
                if (data.creator.id !== auth.currentUser?.uid) {
                    setError('You are not authorized to edit this campaign');
                    navigate('/my-campaigns');
                    return;
                }

                setCampaign({ id: campaignDoc.id, ...data });
                setQrCodes(data.qrCodes || []);
            } else {
                setError('Campaign not found');
                navigate('/my-campaigns');
            }
        } catch (error) {
            console.error('Error fetching campaign:', error);
            setError('Error loading campaign data');
        } finally {
            setLoading(false);
        }
    };

    const handleQRCodesChange = (updatedQRCodes) => {
        setQrCodes(updatedQRCodes);
    };

    const handleSaveQRCodes = async () => {
        try {
            setSaving(true);
            setError('');

            // Filter valid QR codes (at least have bank name and image)
            const validQRCodes = qrCodes.filter(qr =>
                qr.imageUrl && qr.bankName && qr.accountHolder
            );

            // Update in Firestore
            await updateDoc(doc(db, 'campaigns', campaignId), {
                qrCodes: validQRCodes
            });

            // Update in context
            await updateCampaignQRCodes(campaignId, validQRCodes);

            alert('Payment methods updated successfully!');
            navigate(`/campaign/${campaignId}`);
        } catch (error) {
            console.error('Error updating QR codes:', error);
            setError('Failed to update payment methods. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount) => {
        return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return <div className="loading">Loading campaign...</div>;
    }

    if (error && !campaign) {
        return (
            <div className="error-container">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/my-campaigns')} className="cancel-button">
                    Back to My Campaigns
                </button>
            </div>
        );
    }

    if (!campaign) {
        return null;
    }

    return (
        <div className="edit-campaign-container">
            <div className="edit-campaign-header">
                <h1>Edit Campaign Payment Methods</h1>
                <p>Update your QR codes to receive donations</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="edit-campaign-content">
                {/* Campaign Info */}
                <div className="campaign-info-card">
                    <h2>{campaign.title}</h2>
                    <div className="campaign-stats">
                        <div className="stat">
                            <span className="label">Raised:</span>
                            <span className="value">{formatCurrency(campaign.currentAmount)}</span>
                        </div>
                        <div className="stat">
                            <span className="label">Goal:</span>
                            <span className="value">{formatCurrency(campaign.goalAmount)}</span>
                        </div>
                        <div className="stat">
                            <span className="label">Donors:</span>
                            <span className="value">{campaign.donationCount || 0}</span>
                        </div>
                    </div>
                </div>

                {/* QR Code Management */}
                <div className="qr-management-card">
                    <h3>Payment Methods</h3>
                    <p>Manage your QR codes for receiving donations. Donors will scan these to send money directly to your bank account.</p>

                    <QRUpload
                        onQRCodesChange={handleQRCodesChange}
                        existingQRCodes={qrCodes}
                    />
                </div>

                {/* Pending Donations (if any) */}
                {campaign.donations && campaign.donations.some(d => d.status === 'pending') && (
                    <div className="pending-donations-card">
                        <h3>Pending Donations</h3>
                        <p>These donations are waiting for verification:</p>
                        <div className="donations-list">
                            {campaign.donations
                                .filter(donation => donation.status === 'pending')
                                .slice(0, 5)
                                .map((donation, index) => (
                                    <div key={index} className="donation-item">
                                        <div className="donation-info">
                                            <strong>{donation.donorName}</strong>
                                            <span className="donation-amount">{formatCurrency(donation.amount)}</span>
                                        </div>
                                        <div className="donation-details">
                                            <p>Email: {donation.donorEmail}</p>
                                            {donation.referenceNumber && (
                                                <p>Reference: {donation.referenceNumber}</p>
                                            )}
                                            {donation.message && (
                                                <p className="donation-message">"{donation.message}"</p>
                                            )}
                                        </div>
                                        <div className="donation-actions">
                                            <small>Verify payment manually and update status</small>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate(`/campaign/${campaignId}`)}
                        className="cancel-button"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveQRCodes}
                        className="submit-button"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Payment Methods'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EditCampaign;
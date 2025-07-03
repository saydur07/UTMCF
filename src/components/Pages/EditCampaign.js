// src/components/Pages/EditCampaign.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './EditCampaign.css';

// Cloudinary configuration - same as AddItem and CreateCampaign
const CLOUD_NAME = "dh4zcjn4r";
const UPLOAD_PRESET = "happ2zxv";

function EditCampaign() {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [category, setCategory] = useState('');
    const [endDate, setEndDate] = useState('');
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const user = auth.currentUser;

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                setLoading(true);
                const docRef = doc(db, 'campaigns', campaignId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const campaignData = docSnap.data();

                    // Check if user is the creator
                    if (campaignData.creator.id !== user?.uid) {
                        setError('You are not authorized to edit this campaign');
                        setLoading(false);
                        return;
                    }

                    setCampaign({ id: docSnap.id, ...campaignData });
                    setTitle(campaignData.title);
                    setDescription(campaignData.description);
                    setGoalAmount(campaignData.goalAmount.toString());
                    setCategory(campaignData.category || '');
                    setExistingImages(campaignData.images || []);

                    // Format date for input field
                    if (campaignData.endDate) {
                        const endDate = campaignData.endDate.toDate ? campaignData.endDate.toDate() : new Date(campaignData.endDate);
                        const formattedDate = endDate.toISOString().split('T')[0];
                        setEndDate(formattedDate);
                    }
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

        if (campaignId && user) {
            fetchCampaign();
        }
    }, [campaignId, user]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setNewImages(files);

        // Create preview URLs for new images
        const previewUrlsArray = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls(previewUrlsArray);
    };

    const removeExistingImage = (indexToRemove) => {
        setExistingImages(prevImages =>
            prevImages.filter((_, index) => index !== indexToRemove)
        );
    };

    const uploadToCloudinary = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
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

        if (!user) {
            setError('You must be logged in to edit a campaign');
            return;
        }

        if (!title || !description || !goalAmount) {
            setError('Please fill in all required fields');
            return;
        }

        const numGoalAmount = parseFloat(goalAmount);
        if (isNaN(numGoalAmount) || numGoalAmount <= 0) {
            setError('Please enter a valid goal amount');
            return;
        }

        if (endDate) {
            const selectedDate = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate <= today) {
                setError('End date must be in the future');
                return;
            }
        }

        // Check if we have at least one image (existing or new)
        if (existingImages.length === 0 && newImages.length === 0) {
            setError('Please keep at least one image or add new ones');
            return;
        }

        try {
            setSaving(true);
            setError('');

            let finalImageUrls = [...existingImages];

            // Upload new images if any
            if (newImages.length > 0) {
                console.log(`Uploading ${newImages.length} new images...`);

                for (const img of newImages) {
                    try {
                        const url = await uploadToCloudinary(img);
                        if (url) {
                            finalImageUrls.push(url);
                        }
                    } catch (err) {
                        console.error('Error with image upload:', err);
                        // Continue with other images even if one fails
                    }
                }
            }

            if (finalImageUrls.length === 0) {
                throw new Error('No images available for the campaign');
            }

            // Update campaign data
            const updateData = {
                title,
                description,
                goalAmount: numGoalAmount,
                category: category || 'other',
                endDate: endDate ? new Date(endDate) : null,
                images: finalImageUrls,
                updatedAt: new Date()
            };

            const campaignRef = doc(db, 'campaigns', campaignId);
            await updateDoc(campaignRef, updateData);

            // Clean up preview URLs
            previewUrls.forEach(URL.revokeObjectURL);

            alert('Campaign updated successfully!');
            navigate(`/campaign/${campaignId}`);
        } catch (error) {
            console.error('Error updating campaign:', error);
            setError(`Failed to update campaign: ${error.message}`);
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading campaign...</div>;
    }

    if (error && !campaign) {
        return (
            <div className="error-container">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/my-campaigns')}>
                    ← Back to My Campaigns
                </button>
            </div>
        );
    }

    if (!campaign) {
        return null;
    }

    return (
        <div className="edit-campaign-container">
            <h1>Edit Campaign</h1>
            <p className="subtitle">Update your fundraising campaign details</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="edit-campaign-form">
                <div className="form-group">
                    <label htmlFor="title">Campaign Title *</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a compelling campaign title"
                        required
                        maxLength="100"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Campaign Description *</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell your story. Explain why you're raising money and how it will be used."
                        rows="6"
                        required
                        maxLength="2000"
                    />
                    <p className="help-text">
                        {description.length}/2000 characters
                    </p>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="goalAmount">Goal Amount (RM) *</label>
                        <input
                            type="number"
                            id="goalAmount"
                            value={goalAmount}
                            onChange={(e) => setGoalAmount(e.target.value)}
                            min="1"
                            step="1"
                            placeholder="5000"
                            required
                        />
                        <p className="help-text">
                            Current raised: RM {campaign.currentAmount.toFixed(2)}
                        </p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="endDate">End Date (Optional)</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={getMinDate()}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="category">Campaign Category</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">Select a category</option>
                        <option value="medical">Medical & Healthcare</option>
                        <option value="education">Education</option>
                        <option value="emergency">Emergency</option>
                        <option value="community">Community</option>
                        <option value="sports">Sports & Activities</option>
                        <option value="environment">Environment</option>
                        <option value="animals">Animals & Pets</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                {/* Existing Images */}
                {existingImages.length > 0 && (
                    <div className="form-group">
                        <label>Current Images</label>
                        <div className="existing-images">
                            {existingImages.map((imageUrl, index) => (
                                <div key={index} className="existing-image">
                                    <img src={imageUrl} alt={`Campaign ${index}`} />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(index)}
                                        className="remove-image-btn"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* New Images */}
                <div className="form-group">
                    <label htmlFor="newImages">Add New Images (Optional)</label>
                    <input
                        type="file"
                        id="newImages"
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                    />
                    <p className="help-text">Upload additional images if needed</p>

                    {previewUrls.length > 0 && (
                        <div className="image-previews">
                            <h4>New Images Preview:</h4>
                            {previewUrls.map((url, index) => (
                                <div key={index} className="image-preview">
                                    <img src={url} alt={`New preview ${index}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="campaign-stats">
                    <div className="stat">
                        <strong>Current Amount:</strong> RM {campaign.currentAmount.toFixed(2)}
                    </div>
                    <div className="stat">
                        <strong>Donations:</strong> {campaign.donationCount || 0}
                    </div>
                    <div className="stat">
                        <strong>Progress:</strong> {((campaign.currentAmount / campaign.goalAmount) * 100).toFixed(1)}%
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate(`/campaign/${campaignId}`)}
                        className="cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={saving}
                    >
                        {saving ? 'Updating Campaign...' : 'Update Campaign'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditCampaign;
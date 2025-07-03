// src/components/Pages/CreateCampaign.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import QRUpload from '../Payment/QRUpload';
import './CreateCampaign.css';

// Cloudinary configuration - same as AddItem
const CLOUD_NAME = "dh4zcjn4r";
const UPLOAD_PRESET = "happ2zxv";

function CreateCampaign() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [category, setCategory] = useState('');
    const [endDate, setEndDate] = useState('');
    const [images, setImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const user = auth.currentUser;

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages(files);

        // Create preview URLs
        const previewUrlsArray = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls(previewUrlsArray);
    };

    const handleQRCodesChange = (updatedQRCodes) => {
        setQrCodes(updatedQRCodes);
    };

    const uploadToCloudinary = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            console.log(`Uploading to Cloudinary: ${CLOUD_NAME} with preset: ${UPLOAD_PRESET}`);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Cloudinary error:', errorData);
                throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('Upload successful:', data.secure_url);
            return data.secure_url;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    };

    // Get minimum date (today)
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
            setError('You must be logged in to create a campaign');
            return;
        }

        if (!title || !description || !goalAmount || images.length === 0) {
            setError('Please fill in all required fields and add at least one image');
            return;
        }

        // Validate goal amount
        const numGoalAmount = parseFloat(goalAmount);
        if (isNaN(numGoalAmount) || numGoalAmount <= 0) {
            setError('Please enter a valid goal amount');
            return;
        }

        // Validate end date if provided
        if (endDate) {
            const selectedDate = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time for comparison

            if (selectedDate <= today) {
                setError('End date must be in the future');
                return;
            }
        }

        // Validate QR codes - at least one complete QR code is required
        const validQRCodes = qrCodes.filter(qr =>
            qr.imageUrl && qr.bankName && qr.accountHolder
        );

        if (validQRCodes.length === 0) {
            setError('At least one complete payment method is required (QR code with bank details)');
            return;
        }

        try {
            setLoading(true);
            setError('');

            console.log('Starting campaign creation process...');

            // Upload all images to Cloudinary
            const imageUrls = [];
            console.log(`Uploading ${images.length} images...`);

            for (const img of images) {
                try {
                    const url = await uploadToCloudinary(img);
                    if (url) {
                        imageUrls.push(url);
                    }
                } catch (err) {
                    console.error('Error with image upload:', err);
                    // Continue with other images even if one fails
                }
            }

            if (imageUrls.length === 0) {
                throw new Error('Failed to upload any images. Please try again.');
            }

            console.log(`Successfully uploaded ${imageUrls.length} images`);
            console.log('Adding campaign to Firestore...');

            // Create campaign data
            const campaignData = {
                title,
                description,
                goalAmount: numGoalAmount,
                currentAmount: 0,
                donationCount: 0,
                category: category || 'other',
                endDate: endDate ? new Date(endDate) : null,
                images: imageUrls,
                qrCodes: validQRCodes, // Add QR codes to campaign
                donations: [], // Initialize donations array
                creator: {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName || null
                },
                createdAt: new Date(),
                lastDonation: null,
                status: 'active'
            };

            console.log('Campaign data:', campaignData);

            const docRef = await addDoc(collection(db, 'campaigns'), campaignData);
            console.log('Campaign created with ID:', docRef.id);

            // Clean up preview URLs
            previewUrls.forEach(URL.revokeObjectURL);

            alert('Campaign created successfully!');

            // Redirect to fundraising page
            navigate('/fundraising');
        } catch (error) {
            console.error('Error creating campaign:', error);
            setError(`Failed to create campaign: ${error.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="create-campaign-container">
            <h1>Create Fundraising Campaign</h1>
            <p className="subtitle">Start a campaign to raise money for your cause</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="create-campaign-form">
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
                    <p className="help-text">Keep it clear and engaging</p>
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
                        {description.length}/2000 characters - Be detailed about your cause
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
                        <p className="help-text">Set a realistic fundraising goal</p>
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
                        <p className="help-text">Leave blank for ongoing campaign</p>
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
                    <p className="help-text">Help people find your campaign</p>
                </div>

                <div className="form-group">
                    <label htmlFor="images">Campaign Images *</label>
                    <input
                        type="file"
                        id="images"
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        required
                    />
                    <p className="help-text">Upload compelling images that tell your story</p>

                    {previewUrls.length > 0 && (
                        <div className="image-previews">
                            {previewUrls.map((url, index) => (
                                <div key={index} className="image-preview">
                                    <img src={url} alt={`Preview ${index}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* QR Code Upload Section */}
                <QRUpload
                    onQRCodesChange={handleQRCodesChange}
                    existingQRCodes={qrCodes}
                />

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate('/fundraising')}
                        className="cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? 'Creating Campaign...' : 'Create Campaign'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateCampaign;
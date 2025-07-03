// src/components/Pages/AddItem.js (Modified with QR)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import QRUpload from '../Payment/QRUpload';
import './Additem.css';

// Cloudinary configuration
const CLOUD_NAME = "dh4zcjn4r";
const UPLOAD_PRESET = "happ2zxv";

function AddItem() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [images, setImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [qrCodes, setQrCodes] = useState([]);
    const [meetupPreference, setMeetupPreference] = useState(true);
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            setError('You must be logged in to add a product');
            return;
        }

        if (!name || !price || images.length === 0) {
            setError('Please fill in all required fields and add at least one image');
            return;
        }

        // Validate price is a valid number
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice <= 0) {
            setError('Please enter a valid price');
            return;
        }

        // Validate QR codes if user wants to accept QR payments
        const validQRCodes = qrCodes.filter(qr =>
            qr.imageUrl && qr.bankName && qr.accountHolder
        );

        if (validQRCodes.length === 0 && !meetupPreference) {
            setError('Please add at least one payment method or enable meetup option');
            return;
        }

        try {
            setLoading(true);
            setError('');

            console.log('Starting product upload process...');

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
            console.log('Adding product to Firestore...');

            // Add product to Firestore
            const productData = {
                name,
                description,
                price: numPrice,
                category: category || 'other',
                images: imageUrls,
                qrCodes: validQRCodes, // Payment QR codes
                meetupPreference: meetupPreference, // Whether seller accepts meetups
                orders: [], // Track orders/sales
                seller: {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName || null
                },
                createdAt: new Date(),
                status: 'active'
            };

            console.log('Product data:', productData);

            const docRef = await addDoc(collection(db, 'products'), productData);
            console.log('Product added with ID:', docRef.id);

            // Clean up preview URLs
            previewUrls.forEach(URL.revokeObjectURL);

            alert('Product listed successfully!');

            // Redirect to marketplace
            navigate('/marketplace');
        } catch (error) {
            console.error('Error adding product:', error);
            setError(`Failed to add product: ${error.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="add-item-container">
            <h1>List Item for Sale</h1>
            <p className="subtitle">Add your product with payment options for buyers</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="add-item-form">
                <div className="form-group">
                    <label htmlFor="name">Product Name *</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter product name"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your product"
                        rows="4"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="price">Price (RM) *</label>
                        <input
                            type="number"
                            id="price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="">Select a category</option>
                            <option value="books">Books</option>
                            <option value="clothing">Clothing</option>
                            <option value="electronics">Electronics</option>
                            <option value="furniture">Furniture</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="images">Product Images *</label>
                    <input
                        type="file"
                        id="images"
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                        required
                    />
                    <p className="help-text">You can upload multiple images</p>

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

                {/* Payment Options Section */}
                <div className="payment-options-section">
                    <h3>Payment Options for Buyers</h3>
                    <p className="section-description">
                        Choose how buyers can pay for your products. You can enable both options.
                    </p>

                    <div className="payment-preferences">
                        <div className="preference-option">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={meetupPreference}
                                    onChange={(e) => setMeetupPreference(e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                <div className="option-info">
                                    <strong>Accept Meetup Payments</strong>
                                    <p>Buyers can arrange to meet you in person and pay with cash</p>
                                </div>
                            </label>
                        </div>

                        <div className="qr-payment-section">
                            <div className="qr-header">
                                <h4>QR Payment Methods</h4>
                                <p>Allow buyers to pay instantly via QR code scan</p>
                            </div>

                            <QRUpload
                                onQRCodesChange={handleQRCodesChange}
                                existingQRCodes={qrCodes}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate('/marketplace')}
                        className="cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading}
                    >
                        {loading ? 'Uploading...' : 'List for Sale'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AddItem;
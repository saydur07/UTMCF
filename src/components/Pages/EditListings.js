// src/components/Pages/EditListing.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import '../Pages/EditListings.css';

// Cloudinary configuration
const CLOUD_NAME = "dh4zcjn4r";  // Replace with your actual cloud name
const UPLOAD_PRESET = "happ2zxv";  // Replace with your actual upload preset

const EditListing = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = auth.currentUser;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [currentImages, setCurrentImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            setError('You must be logged in to edit listings');
            setLoading(false);
            return;
        }

        const fetchListing = async () => {
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Check if the current user is the owner of this listing
                    if (data.seller.id !== user.uid) {
                        setError("You don't have permission to edit this listing");
                        setLoading(false);
                        return;
                    }

                    setName(data.name || '');
                    setDescription(data.description || '');
                    setPrice(data.price?.toString() || '');
                    setCategory(data.category || '');
                    setStatus(data.status || 'active');
                    setCurrentImages(data.images || []);
                    setLoading(false);
                } else {
                    setError("Listing not found");
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error fetching listing:", err);
                setError("Failed to load listing. Please try again.");
                setLoading(false);
            }
        };

        fetchListing();
    }, [id, user]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setNewImages(files);

        // Create preview URLs for new images
        const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls(newPreviewUrls);
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

    const handleRemoveCurrentImage = (index) => {
        setCurrentImages(currentImages.filter((_, i) => i !== index));
    };

    const handleRemoveNewImage = (index) => {
        const updatedNewImages = [...newImages];
        updatedNewImages.splice(index, 1);
        setNewImages(updatedNewImages);

        const updatedPreviewUrls = [...previewUrls];
        URL.revokeObjectURL(updatedPreviewUrls[index]);
        updatedPreviewUrls.splice(index, 1);
        setPreviewUrls(updatedPreviewUrls);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            setError('You must be logged in to update a listing');
            return;
        }

        if (!name || !price) {
            setError('Please fill in all required fields');
            return;
        }

        // Validate price is a valid number
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice <= 0) {
            setError('Please enter a valid price');
            return;
        }

        try {
            setUpdating(true);
            setError('');

            // Upload any new images to Cloudinary
            const newImageUrls = [];
            if (newImages.length > 0) {
                for (const img of newImages) {
                    try {
                        const url = await uploadToCloudinary(img);
                        if (url) {
                            newImageUrls.push(url);
                        }
                    } catch (err) {
                        console.error('Error with image upload:', err);
                    }
                }
            }

            // Combine current and new images
            const allImages = [...currentImages, ...newImageUrls];

            if (allImages.length === 0) {
                setError('At least one image is required');
                setUpdating(false);
                return;
            }

            // Update listing in Firestore
            const listingRef = doc(db, "products", id);
            await updateDoc(listingRef, {
                name,
                description,
                price: numPrice,
                category: category || 'other',
                status,
                images: allImages,
                updatedAt: new Date()
            });

            // Clean up preview URLs
            previewUrls.forEach(URL.revokeObjectURL);

            alert('Listing updated successfully!');

            // Redirect to my listings
            navigate('/my-listings');
        } catch (error) {
            console.error('Error updating listing:', error);
            setError(`Failed to update listing: ${error.message}`);
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="loading-container">Loading listing details...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <p>{error}</p>
                <button onClick={() => navigate('/my-listings')} className="back-button">
                    Back to My Listings
                </button>
            </div>
        );
    }

    return (
        <div className="edit-listing-container">
            <h1>Edit Listing</h1>

            <form onSubmit={handleSubmit} className="edit-listing-form">
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
                    <label htmlFor="status">Status</label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="active">Active</option>
                        <option value="sold">Sold</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Current Images</label>
                    {currentImages.length > 0 ? (
                        <div className="image-previews">
                            {currentImages.map((url, index) => (
                                <div key={index} className="image-preview">
                                    <img src={url} alt={`Current ${index}`} />
                                    <button
                                        type="button"
                                        className="remove-image"
                                        onClick={() => handleRemoveCurrentImage(index)}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-images">No current images</p>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="newImages">Add New Images</label>
                    <input
                        type="file"
                        id="newImages"
                        onChange={handleImageChange}
                        accept="image/*"
                        multiple
                    />
                    <p className="help-text">You can upload multiple images</p>

                    {previewUrls.length > 0 && (
                        <div className="image-previews">
                            {previewUrls.map((url, index) => (
                                <div key={index} className="image-preview">
                                    <img src={url} alt={`New ${index}`} />
                                    <button
                                        type="button"
                                        className="remove-image"
                                        onClick={() => handleRemoveNewImage(index)}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate('/my-listings')}
                        className="cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={updating}
                    >
                        {updating ? 'Updating...' : 'Update Listing'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditListing;
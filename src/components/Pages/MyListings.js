// src/components/Pages/MyListings.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import './MyListings.css';

const MyListings = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setError("You must be logged in to view your listings");
            setLoading(false);
            return;
        }

        const fetchListings = async () => {
            try {
                const q = query(
                    collection(db, "products"),
                    where("seller.id", "==", user.uid)
                );

                const querySnapshot = await getDocs(q);
                const listingsData = [];

                querySnapshot.forEach((doc) => {
                    listingsData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                setListings(listingsData);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching listings:", err);
                setError("Failed to load your listings. Please try again.");
                setLoading(false);
            }
        };

        fetchListings();
    }, [user]);

    const handleDeleteListing = async (listingId) => {
        if (window.confirm("Are you sure you want to delete this listing?")) {
            try {
                await deleteDoc(doc(db, "products", listingId));
                // Update the listings state to remove the deleted item
                setListings(listings.filter(listing => listing.id !== listingId));
                alert("Listing deleted successfully!");
            } catch (err) {
                console.error("Error deleting listing:", err);
                alert("Failed to delete listing. Please try again.");
            }
        }
    };

    if (loading) {
        return <div className="loading-container">Loading your listings...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    if (listings.length === 0) {
        return (
            <div className="my-listings-container">
                <h1>My Listings</h1>
                <div className="no-listings">
                    <p>You haven't listed any items for sale yet.</p>
                    <Link to="/add-item" className="add-listing-btn">
                        List an Item for Sale
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="my-listings-container">
            <div className="my-listings-header">
                <h1>My Listings</h1>
                <Link to="/add-item" className="add-listing-btn">
                    + Add New Listing
                </Link>
            </div>

            <div className="listings-grid">
                {listings.map(listing => (
                    <div key={listing.id} className="listing-card">
                        <div className="listing-image">
                            {listing.images && listing.images.length > 0 ? (
                                <img src={listing.images[0]} alt={listing.name} />
                            ) : (
                                <div className="no-image">No Image</div>
                            )}
                        </div>

                        <div className="listing-info">
                            <h3>{listing.name}</h3>
                            <p className="listing-price">RM {listing.price.toFixed(2)}</p>
                            <p className="listing-status">
                                Status: <span className={`status-${listing.status}`}>{listing.status}</span>
                            </p>
                        </div>

                        <div className="listing-actions">
                            <Link to={`/edit-listing/${listing.id}`} className="edit-btn">
                                Edit
                            </Link>
                            <button
                                onClick={() => handleDeleteListing(listing.id)}
                                className="delete-btn"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyListings;
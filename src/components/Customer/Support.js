// === 3. Update: src/components/Customer/Support.js ===
import React from 'react';
import GeminiAIBot from '../AISupport/GeminiAIBot';

const Support = () => {
    return (
        <div className="support-page">
            <div className="support-header">
                <h1>🚀 UTMCF Support Center</h1>
                <p>Get instant help with our AI-powered support assistant</p>
            </div>
            <GeminiAIBot />
        </div>
    );
};

export default Support;
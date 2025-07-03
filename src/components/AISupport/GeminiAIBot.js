import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../../firebase';
import './AISupportBot.css';

const GeminiAIBot = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello! I'm your AI assistant powered by Google Gemini. I can help you with anything - UTMCF marketplace questions, general advice, explanations, or just chat. What would you like to talk about?",
            isBot: true,
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [apiError, setApiError] = useState(false);
    const messagesEndRef = useRef(null);
    const user = auth.currentUser;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Google Gemini API Configuration
    const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    // System instruction for Gemini
    const SYSTEM_INSTRUCTION = `You are a helpful, knowledgeable, and friendly AI assistant for UTMCF Marketplace. You can discuss any topic and help with various questions.

ABOUT UTMCF MARKETPLACE:
- University-based marketplace and fundraising platform
- Features: buying/selling items, fundraising campaigns, QR payments, order chat
- Key sections: Marketplace, Fundraising, My Orders, My Listings, My Campaigns

YOUR CAPABILITIES:
- Answer questions on ANY topic (science, technology, advice, explanations)
- Help with UTMCF platform when relevant
- Provide explanations, solve problems, give advice
- Have natural conversations
- Be creative, helpful, and engaging

PERSONALITY:
- Friendly and conversational
- Clear and helpful explanations
- Use emojis appropriately
- Be concise but thorough when needed
- Ask follow-up questions to better help

Remember: You're a general AI assistant who happens to know about UTMCF. Help with anything the user asks!`;

    // Google Gemini API Call
    const callGeminiAPI = async (userMessage, conversationHistory) => {
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }

        // Prepare conversation history for Gemini
        const contents = [
            {
                role: "user",
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            {
                role: "model",
                parts: [{ text: "I understand. I'm ready to help as your friendly AI assistant for UTMCF Marketplace. I can assist with platform questions and general topics alike!" }]
            }
        ];

        // Add conversation history (last 8 messages)
        conversationHistory.slice(-8).forEach(msg => {
            contents.push({
                role: msg.isBot ? "model" : "user",
                parts: [{ text: msg.text }]
            });
        });

        // Add current user message
        contents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 800,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Error:', errorData);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid response format');
            }

        } catch (fetchError) {
            console.error('Gemini API fetch error:', fetchError);
            throw fetchError;
        }
    };

    // Enhanced fallback responses
    const getFallbackResponse = (userMessage) => {
        const message = userMessage.toLowerCase();

        if (message.includes('technical') || message.includes('tech') || message.includes('problem') || message.includes('issue') || message.includes('bug')) {
            return "🔧 **Technical Support:**\n\n**Common Solutions:**\n• **Page Loading**: Refresh browser (Ctrl+F5)\n• **Upload Issues**: Check file size (under 5MB) and format (JPG/PNG)\n• **Login Problems**: Clear browser cache and cookies\n• **Payment QR**: Ensure image is clear and well-lit\n• **Chat Issues**: Close and reopen chat sidebar\n• **Slow Performance**: Close other browser tabs\n• **Order Problems**: Use order-specific chat with seller\n\n**Still having issues?** Describe exactly what's happening, what page you're on, and any error messages. I'll help troubleshoot step by step!";
        }

        if (message.includes('marketplace') || message.includes('sell') || message.includes('buy')) {
            return "🛒 **Marketplace Guide:**\n\n**For Sellers:**\n• Click 'Add Item' in navigation\n• Upload clear photos and description\n• Set fair price and category\n• Manage via 'My Listings'\n\n**For Buyers:**\n• Browse 'Marketplace' section\n• Add items to cart\n• Upload QR payment proof at checkout\n• Track orders in 'My Orders'\n\n**Communication:**\n• Use order chat for buyer-seller discussion\n• Be respectful and clear\n\nWhat specific marketplace help do you need?";
        }

        if (message.includes('campaign') || message.includes('fundraising')) {
            return "💰 **Fundraising Help:**\n\n**Creating Campaigns:**\n• Go to 'Fundraising' → 'Create Campaign'\n• Write compelling description and goal\n• Upload engaging images\n• Set realistic funding target\n\n**Managing Campaigns:**\n• Access 'My Campaigns' in profile\n• Update supporters regularly\n• Share campaign link widely\n• Monitor donations and progress\n\n**Getting Donations:**\n• Share on social media\n• Email friends and family\n• Update progress regularly\n\nNeed help with a specific fundraising step?";
        }

        return "🤖 **I'm here to help!**\n\nI can assist with:\n\n• **UTMCF Platform**: Marketplace, fundraising, payments\n• **Technical Issues**: Troubleshooting and solutions\n• **General Questions**: Advice, explanations, guidance\n• **Problem-Solving**: Step-by-step assistance\n\nI'm currently in basic mode but still very helpful! What would you like assistance with?";
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage = {
            id: Date.now(),
            text: inputText,
            isBot: false,
            timestamp: new Date(),
            user: user?.email || 'Anonymous'
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputText;
        setInputText('');
        setIsTyping(true);
        setApiError(false);

        try {
            const recentHistory = messages.slice(-6);
            const aiResponse = await callGeminiAPI(currentInput, recentHistory);

            const botResponse = {
                id: Date.now() + 1,
                text: aiResponse,
                isBot: true,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botResponse]);

        } catch (error) {
            console.error('AI Response Error:', error);
            setApiError(true);

            const fallbackResponse = {
                id: Date.now() + 1,
                text: getFallbackResponse(currentInput),
                isBot: true,
                timestamp: new Date(),
                isFallback: true
            };

            setMessages(prev => [...prev, fallbackResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatMessage = (text) => {
        return text.split('\n').map((line, index) => {
            if (line.includes('**')) {
                const parts = line.split('**');
                return (
                    <div key={index} className="message-line">
                        {parts.map((part, partIndex) =>
                            partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part
                        )}
                    </div>
                );
            }

            if (line.trim().startsWith('•')) {
                return <div key={index} className="message-bullet">{line}</div>;
            }

            return <div key={index} className="message-line">{line}</div>;
        });
    };

    const quickActions = [
        { text: "How do I use the marketplace?", emoji: "🛒" },
        { text: "I'm having technical issues", emoji: "🔧" },
        { text: "Help with payments", emoji: "💳" },
        { text: "Campaign support", emoji: "💰" },
        { text: "Explain something to me", emoji: "🧠" },
        { text: "I need advice", emoji: "💡" }
    ];

    const handleQuickAction = (actionText) => {
        setInputText(actionText);
    };

    const clearChat = () => {
        setMessages([
            {
                id: 1,
                text: "Chat cleared! I'm here to help with anything you need. What would you like to talk about?",
                isBot: true,
                timestamp: new Date()
            }
        ]);
        setApiError(false);
    };

    return (
        <div className="ai-support-container">
            <div className="ai-support-header">
                <div className="ai-support-title">
                    <div className="ai-avatar">
                        <span className="ai-icon">🤖</span>
                        <span className="ai-status"></span>
                    </div>
                    <div className="ai-info">
                        <h3>Gemini AI Assistant</h3>
                        <p>
                            {apiError ? (
                                <span className="api-status error">⚠️ Basic mode • Still helpful!</span>
                            ) : (
                                <span className="api-status online">✅ Powered by Google Gemini • Ready for anything</span>
                            )}
                        </p>
                    </div>
                </div>
                <button className="clear-chat-btn" onClick={clearChat} title="Clear chat">
                    🗑️
                </button>
            </div>

            <div className="ai-support-messages">
                {messages.length === 1 && (
                    <div className="quick-actions">
                        <div className="quick-actions-title">Quick start:</div>
                        <div className="quick-actions-grid">
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    className="quick-action-btn"
                                    onClick={() => handleQuickAction(action.text)}
                                >
                                    <span className="quick-action-emoji">{action.emoji}</span>
                                    <span className="quick-action-text">{action.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div key={message.id} className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}>
                        {message.isBot && (
                            <div className="message-avatar">
                                <span className="ai-icon">🤖</span>
                            </div>
                        )}
                        <div className="message-content">
                            <div className="message-text">
                                {message.isFallback && (
                                    <div className="fallback-notice">
                                        💡 Basic mode response
                                    </div>
                                )}
                                {typeof message.text === 'string' && message.text.includes('\n')
                                    ? formatMessage(message.text)
                                    : message.text
                                }
                            </div>
                            <div className="message-time">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="message bot-message">
                        <div className="message-avatar">
                            <span className="ai-icon">🤖</span>
                        </div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span className="typing-text">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-support-input">
                <div className="input-container">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything - platform questions, technical help, advice, or just chat..."
                        rows="1"
                        disabled={isTyping}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isTyping}
                        className="send-button"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22,2 15,22 11,13 2,9"></polygon>
                        </svg>
                    </button>
                </div>
                <div className="input-footer">
                    <span className="user-info">💬 {user?.email || 'Anonymous'}</span>
                    <span className="ai-info">
                        {apiError ? '🔧 Basic AI Mode' : '🚀 Powered by Google Gemini'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GeminiAIBot;

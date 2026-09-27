import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from "react-markdown";

export default function ChatWidget() {
    const { messages, isOpen, isLoading, toggleChat, sendMessage } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const location = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Hide widget on the dedicated chat page
    if (location.pathname === '/ask-assetra') return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input);
            setInput('');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                <Bot className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="font-semibold text-white">Ask Assetra</span>
                        </div>
                        <button onClick={toggleChat} className="p-1 text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 mt-4 text-sm">
                                Hello! I'm your Assetra AI. Ask me about your receipts or warranties!
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/30 mt-1">
                                        <Bot className="w-4 h-4 text-blue-400" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                                    <p className="whitespace-pre-wrap"><ReactMarkdown>{msg.content}</ReactMarkdown></p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/30 mt-1">
                                    <Bot className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-slate-950 border-t border-slate-800">
                        <form onSubmit={handleSubmit} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message Assetra..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-full py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                disabled={isLoading}
                            />
                            <button 
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-full transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={toggleChat}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>
        </div>
    );
}

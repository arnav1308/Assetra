import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from "react-markdown";

export default function AskAssetra() {
    const { messages, sendMessage, isLoading, closeChat } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Ensure floating widget is closed when we're on the dedicated page
    useEffect(() => {
        closeChat();
    }, [closeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Ask Assetra</h1>
                    <p className="text-slate-400 text-center max-w-md mb-8">
                        I know everything about your uploaded receipts, assets, and warranties. What would you like to know?
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                                        <Bot className="w-5 h-5 text-blue-400" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'}`}>
                                    <p className="whitespace-pre-wrap"><ReactMarkdown>{msg.content}</ReactMarkdown></p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                        <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 justify-start">
                                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            <div className="p-4 md:p-6 bg-slate-950 border-t border-slate-900">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your assets, receipts, or warranties..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-full py-4 pl-6 pr-14 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-full transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}

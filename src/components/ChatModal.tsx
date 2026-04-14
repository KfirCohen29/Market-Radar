import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Bot, User } from 'lucide-react';
import { NewsItem, ThemeColor } from '../types';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatModalProps {
  article: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
  themeColor: ThemeColor;
}

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const themeClasses = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-600', hover: 'hover:bg-blue-700' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-600', hover: 'hover:bg-emerald-700' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-600', hover: 'hover:bg-violet-700' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-600', hover: 'hover:bg-rose-700' },
};

export function ChatModal({ article, isOpen, onClose, themeColor }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = themeClasses[themeColor];
  const isHebrew = article?.language?.toLowerCase() === 'hebrew' || article?.language === 'עברית';

  // Reset chat when article changes
  useEffect(() => {
    if (article) {
      setMessages([{
        role: 'assistant',
        content: isHebrew 
          ? `היי! אני כאן כדי לענות על שאלות לגבי הכתבה. מה תרצה לדעת?`
          : `Hi! I'm here to answer questions about the article. What would you like to know?`
      }]);
    }
  }, [article, isHebrew]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !article) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      // Build context
      const context = `
You are a helpful financial AI assistant. The user is asking a question about the following news article:

Headline: ${article.headline}
Summary: ${article.shortSummary}
Detailed Explanation: ${article.detailedExplanation}
Sentiment: ${article.sentiment || 'Unknown'}
Impact Score: ${article.impactScore || 'Unknown'}/10

Please answer the user's question concisely and accurately based on this context. If the answer is not in the context, use your general knowledge but mention that it's not explicitly stated in the article. Answer in the same language the user asks.
      `;

      // Build chat history for Gemini
      const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      
      const prompt = `${context}\n\nChat History:\n${chatHistory}\n\nUser: ${userMessage}\nAssistant:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      const reply = response.text || (isHebrew ? 'מצטער, לא הצלחתי לייצר תשובה.' : 'Sorry, I could not generate a response.');
      
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: isHebrew ? 'אירעה שגיאה בתקשורת עם ה-AI. אנא נסה שוב.' : 'An error occurred while communicating with the AI. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col h-[80vh] max-h-[800px] border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start space-x-3 flex-1 pr-4">
            <div className={`p-2 rounded-lg shrink-0 ${t.bg}`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">Deep Dive Chat</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir={isHebrew ? 'rtl' : 'ltr'}>
                {article.headline}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : t.bg}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div 
                  className={`px-4 py-2.5 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-br-none' 
                      : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
                  }`}
                  dir={isHebrew ? 'rtl' : 'ltr'}
                >
                  <div className="markdown-body text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] flex-row items-end gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.bg}`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-bl-none">
                  <Loader2 className={`w-4 h-4 animate-spin ${t.text}`} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isHebrew ? "שאל משהו על הכתבה..." : "Ask something about this article..."}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 pr-12 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              rows={1}
              dir={isHebrew ? 'rtl' : 'ltr'}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 bottom-2 p-1.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.bg} ${t.hover}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              AI can make mistakes. Verify important information.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

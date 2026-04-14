import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Calendar, Globe, TrendingUp, TrendingDown, Minus, Zap, MessageCircle } from 'lucide-react';
import { NewsItem, ThemeColor } from '../types';

interface NewsCardProps {
  item: NewsItem;
  themeColor: ThemeColor;
  onAskAI?: (item: NewsItem) => void;
  viewMode?: 'card' | 'compact';
}

const themeClasses = {
  blue: { text: 'text-blue-600 dark:text-blue-400', hover: 'hover:text-blue-800 dark:hover:text-blue-300' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', hover: 'hover:text-emerald-800 dark:hover:text-emerald-300' },
  violet: { text: 'text-violet-600 dark:text-violet-400', hover: 'hover:text-violet-800 dark:hover:text-violet-300' },
  rose: { text: 'text-rose-600 dark:text-rose-400', hover: 'hover:text-rose-800 dark:hover:text-rose-300' },
};

export function NewsCard({ item, themeColor, onAskAI, viewMode = 'card' }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activePopup, setActivePopup] = useState<'sentiment' | 'impact' | null>(null);
  const isHebrew = item.language.toLowerCase() === 'hebrew' || item.language === 'עברית';
  const colors = themeClasses[themeColor];

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'bearish': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'neutral': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="w-3.5 h-3.5 mr-1" />;
      case 'bearish': return <TrendingDown className="w-3.5 h-3.5 mr-1" />;
      default: return <Minus className="w-3.5 h-3.5 mr-1" />;
    }
  };

  if (viewMode === 'compact') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200 hover:shadow-md`} dir="ltr">
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                {item.date}
              </span>
              {item.sentiment && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment.toUpperCase()}
                </span>
              )}
              {item.impactScore !== undefined && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                  IMPACT: {item.impactScore}/10
                </span>
              )}
            </div>
            <h3 className={`text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2 ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
              {item.headline}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`p-1.5 ${colors.text} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors`}
              title={expanded ? (isHebrew ? 'הצג פחות' : 'Show Less') : (isHebrew ? 'קרא עוד' : 'Read More')}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onAskAI && (
              <button
                onClick={() => onAskAI(item)}
                className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                title={isHebrew ? 'שאל את ה-AI' : 'Ask AI'}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
            {item.sourceUrl && (
              <a 
                href={item.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-1.5 ${colors.text} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors`}
                title="Direct link to source"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        
        {expanded && (
          <div className="px-3 sm:px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className={`text-gray-600 dark:text-gray-300 text-sm mb-3 ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
              {item.shortSummary}
            </p>
            <p className={`text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
              {item.detailedExplanation}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-200`} dir="ltr">
      <div className="p-5">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-2 gap-4">
          <h3 className={`text-lg font-semibold text-gray-900 dark:text-white flex-1 ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
            {item.headline}
          </h3>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md shrink-0">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{item.date}</span>
          </div>
        </div>
        
        <p className={`text-gray-600 dark:text-gray-300 text-sm mb-4 ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
          {item.shortSummary}
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {item.sentiment && (
            <div className="relative inline-block">
              <button 
                onClick={() => setActivePopup(activePopup === 'sentiment' ? null : 'sentiment')}
                className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${getSentimentColor(item.sentiment)}`}
                title="Click to see reasoning"
              >
                {getSentimentIcon(item.sentiment)}
                <span className="capitalize">{item.sentiment}</span>
              </button>
              {activePopup === 'sentiment' && item.sentimentReasoning && (
                <div className="absolute z-20 top-full mt-2 left-0 w-56 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-xs leading-relaxed text-left" dir="ltr">
                  <div className="font-semibold mb-1 text-gray-900 dark:text-white">Sentiment Analysis</div>
                  <div className="text-gray-600 dark:text-gray-300">{item.sentimentReasoning}</div>
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                </div>
              )}
            </div>
          )}
          
          {item.impactScore !== undefined && (
            <div className="relative inline-block">
              <button 
                onClick={() => setActivePopup(activePopup === 'impact' ? null : 'impact')}
                className="flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to see reasoning"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Impact: {item.impactScore}/10
              </button>
              {activePopup === 'impact' && item.impactReasoning && (
                <div className="absolute z-20 top-full mt-2 left-0 w-56 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-xs leading-relaxed text-left" dir="ltr">
                  <div className="font-semibold mb-1 text-gray-900 dark:text-white">Market Impact</div>
                  <div className="text-gray-600 dark:text-gray-300">{item.impactReasoning}</div>
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center text-sm font-medium ${colors.text} ${colors.hover} transition-colors`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  {isHebrew ? 'הצג פחות' : 'Show Less'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  {isHebrew ? 'קרא עוד' : 'Read More'}
                </>
              )}
            </button>
            
            {onAskAI && (
              <button
                onClick={() => onAskAI(item)}
                className={`flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors`}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {isHebrew ? 'שאל את ה-AI' : 'Ask AI'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {item.sourceUrl && (
              <a 
                href={item.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center text-xs font-medium ${colors.text} ${colors.hover} transition-colors`}
                title="Direct link to source"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                {item.sourceName || (isHebrew ? 'מקור' : 'Source')}
              </a>
            )}
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(item.headline)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="Search this headline on Google to verify"
            >
              <Globe className="w-3 h-3 mr-1" />
              Verify
            </a>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className={`text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap ${isHebrew ? 'text-right' : 'text-left'}`} dir={isHebrew ? 'rtl' : 'ltr'}>
              {item.detailedExplanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { FilterBar } from './components/FilterBar';
import { NewsCard } from './components/NewsCard';
import { ChatModal } from './components/ChatModal';
import { FilterState, NewsItem, ThemeColor, StockData, SavedFilter } from './types';
import { Activity, AlertCircle, Globe, Moon, Sun, Palette, Download, Plus, Bookmark, X, RefreshCw, TrendingUp, TrendingDown, ExternalLink, ChevronDown } from 'lucide-react';

// Initialize Gemini API inside functions to ensure latest API key is used
// const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY  || '' });

const themeClasses = {
  blue: { 
    iconBg: 'bg-blue-600', 
    text: 'from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300', 
    btnText: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    loadBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 dark:focus:ring-blue-800'
  },
  emerald: { 
    iconBg: 'bg-emerald-600', 
    text: 'from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-300', 
    btnText: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    loadBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300 dark:focus:ring-emerald-800'
  },
  violet: { 
    iconBg: 'bg-violet-600', 
    text: 'from-violet-600 to-violet-400 dark:from-violet-400 dark:to-violet-300', 
    btnText: 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
    loadBtn: 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-300 dark:focus:ring-violet-800'
  },
  rose: { 
    iconBg: 'bg-rose-600', 
    text: 'from-rose-600 to-rose-400 dark:from-rose-400 dark:to-rose-300', 
    btnText: 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',
    loadBtn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300 dark:focus:ring-rose-800'
  },
};

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mt-3 opacity-80">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function App() {
  const [sparklineRange, setSparklineRange] = useState<'1d' | '5d' | '1mo'>('1d');
  const [filters, setFilters] = useState<FilterState>(() => {
    const savedDefaultId = localStorage.getItem('market-radar-default-profile');
    const savedProfiles = localStorage.getItem('market-radar-profiles');
    
    if (savedDefaultId && savedProfiles) {
      try {
        const profiles: SavedFilter[] = JSON.parse(savedProfiles);
        const defaultProfile = profiles.find(p => p.id === savedDefaultId);
        if (defaultProfile) {
          return defaultProfile.filters;
        }
      } catch (e) {
        console.error('Failed to parse saved profiles', e);
      }
    }
    
    // Fallback to legacy saved filters or default
    const saved = localStorage.getItem('market-radar-filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved filters', e);
      }
    }
    return {
      sortBy: 'relevance',
      sector: '',
      ticker: '',
      resultCount: 5,
      date: '',
      market: 'all',
      newsType: '',
    };
  });
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [marketSummary, setMarketSummary] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [activeTickers, setActiveTickers] = useState<string>('');
  const [stockError, setStockError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<{uri: string, title: string}[]>([]);
  const [activeChatArticle, setActiveChatArticle] = useState<NewsItem | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>('blue');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  const [savedProfiles, setSavedProfiles] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem('market-radar-profiles');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isDefaultProfile, setIsDefaultProfile] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveMode) {
      interval = setInterval(() => {
        fetchNews(false);
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => clearInterval(interval);
  }, [isLiveMode, filters]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close theme picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themePickerRef.current && !themePickerRef.current.contains(event.target as Node)) {
        setShowThemePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const saveFilters = () => {
    localStorage.setItem('market-radar-filters', JSON.stringify(filters));
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) return;
    const newId = Date.now().toString();
    const newProfile: SavedFilter = {
      id: newId,
      name: newProfileName.trim(),
      filters: { ...filters }
    };
    const updated = [...savedProfiles, newProfile];
    setSavedProfiles(updated);
    localStorage.setItem('market-radar-profiles', JSON.stringify(updated));
    
    if (isDefaultProfile) {
      localStorage.setItem('market-radar-default-profile', newId);
    }
    
    setNewProfileName('');
    setIsDefaultProfile(false);
    setShowSaveModal(false);
  };

  const handleDeleteProfile = (id: string) => {
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('market-radar-profiles', JSON.stringify(updated));
    if (localStorage.getItem('market-radar-default-profile') === id) {
      localStorage.removeItem('market-radar-default-profile');
    }
  };

  const fetchStockData = async (tickersStr: string, signal?: AbortSignal) => {
    setActiveTickers(tickersStr);
    if (!tickersStr) {
      setStockData([]);
      setStockError(null);
      return;
    }
    const tickers = tickersStr.split(',').map(t => t.trim()).filter(Boolean);
    setStockError(null);
    
    // Map user-friendly tickers to Yahoo Finance symbols
    const symbolMap: Record<string, string> = {
      'TA125': '^TA125.TA',
      'TA90': 'TA90.TA',
      'TA35': 'TA35.TA',
    };
    
    try {
      const rangeToInterval: Record<string, string> = {
        '1d': '15m',
        '5d': '1h',
        '1mo': '1d'
      };
      const interval = rangeToInterval[sparklineRange] || '15m';

      const promises = tickers.map(async (ticker) => {
        const querySymbol = symbolMap[ticker] || ticker;
        
        const res = await fetch(`/api/market-data/${encodeURIComponent(querySymbol)}?range=${sparklineRange}&interval=${interval}`, { signal });
        if (!res.ok) return null;
        
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`Failed to parse JSON for ${querySymbol}. Response text:`, text.substring(0, 200));
          throw e;
        }
        
        const result = data?.chart?.result?.[0];
        const meta = result?.meta;
        const history = result?.indicators?.quote?.[0]?.close?.filter((price: number | null) => price !== null) || [];
        
        if (meta && meta.regularMarketPrice !== undefined) {
          const basePrice = sparklineRange === '1d' ? meta.previousClose : (meta.chartPreviousClose || meta.previousClose);
          if (basePrice === undefined) return null;
          
          const change = meta.regularMarketPrice - basePrice;
          const percentChange = (change / basePrice) * 100;
          return {
            symbol: ticker, // Keep the original user-friendly ticker for display
            currentPrice: meta.regularMarketPrice,
            change: change,
            percentChange: percentChange,
            history: history
          };
        }
        return null;
      });
      const results = await Promise.all(promises);
      setStockData(results.filter(Boolean) as StockData[]);
    } catch (e: any) {
      console.error("Failed to fetch stock data", e);
      setStockError("Stock data unavailable at the moment.");
    }
  };

  const getTickersToFetch = (filters: FilterState): string => {
    if (filters.ticker) return filters.ticker;

    if (filters.sector) {
      const s = filters.sector.toLowerCase();
      if (s.includes('tech') || s.includes('טכנולוגיה')) return 'XLK, AAPL, MSFT, NVDA';
      if (s.includes('health') || s.includes('pharma') || s.includes('בריאות') || s.includes('פארמה')) return 'XLV, LLY, JNJ, UNH';
      if (s.includes('finance') || s.includes('bank') || s.includes('פיננסים') || s.includes('בנקים')) return 'XLF, JPM, BAC, GS';
      if (s.includes('energy') || s.includes('oil') || s.includes('אנרגיה') || s.includes('דלק')) return 'XLE, XOM, CVX';
      if (s.includes('real estate') || s.includes('נדל"ן')) return 'XLRE, PLD, AMT';
      if (s.includes('consumer') || s.includes('צרכנות')) return 'XLY, AMZN, TSLA';
      if (s.includes('communication') || s.includes('תקשורת')) return 'XLC, GOOGL, META';
      if (s.includes('industrial') || s.includes('תעשייה')) return 'XLI, CAT, GE';
      if (s.includes('cyber') || s.includes('סייבר')) return 'CIBR, PANW, CRWD, FTNT';
      if (s.includes('ai') || s.includes('artificial intelligence') || s.includes('בינה מלאכותית')) return 'BOTZ, NVDA, MSFT, GOOGL';
      if (s.includes('retail') || s.includes('קמעונאות')) return 'XRT, WMT, TGT, COST';
      if (s.includes('auto') || s.includes('רכב')) return 'CARZ, TSLA, TM, F';
      if (s.includes('aviation') || s.includes('airlines') || s.includes('תעופה')) return 'JETS, DAL, UAL, LUV';
      if (s.includes('defense') || s.includes('military') || s.includes('ביטחון')) return 'ITA, LMT, RTX, NOC';
      if (s.includes('biotech') || s.includes('ביוטק')) return 'IBB, VRTX, REGN, AMGN';
      if (s.includes('crypto') || s.includes('קריפטו')) return 'IBIT, COIN, MSTR, MARA';
      return ''; // Return empty string for unknown sectors so we don't show general indices
    }

    if (filters.market === 'tase') return 'TA125, TA90, TA35';
    if (filters.market === 'international') return 'SPY, QQQ, DIA, EWJ, EWY, USO';

    return 'SPY, QQQ, USO, TA125';
  };

  useEffect(() => {
    if (activeTickers) {
      fetchStockData(activeTickers);
    } else {
      fetchStockData(getTickersToFetch(filters));
    }
  }, [sparklineRange]);

  const fetchNews = async (isLoadMore = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setHasFetchedInitial(true);
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setNews([]);
      setMarketSummary(null);
      setGroundingUrls([]);
      fetchStockData(getTickersToFetch(filters), signal);
    }
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY  || '' });
      let marketContext = '';
      if (filters.market === 'tase') {
        marketContext = 'CRITICAL: ONLY include news about Israeli companies traded on the Tel Aviv Stock Exchange (TASE). DO NOT include US or global stocks.';
      } else if (filters.market === 'international') {
        marketContext = 'CRITICAL: ONLY include news about international/global markets (e.g., US, Europe, Asia). DO NOT include local Israeli stocks unless they are major global players traded on NASDAQ/NYSE.';
      }

      let exclusionContext = '';
      if (isLoadMore && news.length > 0) {
        const existingHeadlines = news.map(n => n.headline).join('\\n- ');
        exclusionContext = `\nCRITICAL: You are fetching the NEXT page of results. DO NOT return any of the following stories:\n- ${existingHeadlines}\nFind entirely new and different stories that match the criteria.`;
      }

      let dateContext = 'Most recent available';
      if (filters.date) {
        if (filters.date === 'today') {
          const today = new Date().toISOString().split('T')[0];
          dateContext = `News from or around ${today} (Today)`;
        } else {
          dateContext = `News from or around ${filters.date}`;
        }
      }

      const prompt = `
You are an expert financial news aggregator and analyst. 
Find the latest stock market news based on the following criteria:
- Sort By: ${filters.sortBy === 'recent' ? 'Most recent / newly added' : 'Relevance / Top stories'}
- Sector/Domain: ${filters.sector || 'Any'}
- Ticker: ${filters.ticker || 'Any'}
- Preferred News Type: ${filters.newsType || 'Any'} (If specified, prioritize this type of news, but do not strictly limit to it if there aren't enough results)
- Date: ${dateContext}
- Market Focus: ${filters.market === 'all' ? 'Any market' : filters.market === 'tase' ? 'Tel Aviv Stock Exchange (TASE) / Israel' : 'International / Global'}
- Number of results: ${filters.resultCount}

${marketContext}
${exclusionContext}

CRITICAL INSTRUCTIONS TO PREVENT HALLUCINATIONS:
1. You MUST use the Google Search tool to find real-time, up-to-date information.
2. DO NOT use your internal training data to invent or hallucinate news.
3. DO NOT report old historical events (e.g., Nvidia's 2024 stock split) as if they happened today.
4. Verify the publication dates of the articles in the search results. If you cannot find real, recent news matching the criteria, return fewer results or an empty array.

Return a JSON object with EXACTLY this structure:
{
  "marketSummary": "A 1-2 sentence TL;DR summary of the overall trend or main takeaway from all the stories combined. CRITICAL: Write this STRICTLY in English.",
  "relevantTickers": "If a specific sector/domain is requested, provide a comma-separated list of 3-4 major stock tickers and 1 major ETF ticker for that sector (e.g., 'XLK, AAPL, MSFT, NVDA'). If no specific sector is requested, return an empty string.",
  "news": [
    {
      "headline": "The news headline. CRITICAL: If the news is about specific public companies, YOU MUST INCLUDE ALL THEIR TICKER SYMBOLS in parentheses at the end of the headline, separated by spaces (e.g., 'Apple and Microsoft announce partnership (AAPL) (MSFT)'). If the company is private, include its name and mention it is private (e.g., 'SpaceX launches rocket (SpaceX - Private)'). If the news is general or NOT about a specific company, DO NOT include any ticker or parentheses.",
      "shortSummary": "A brief 1-2 sentence summary.",
      "detailedExplanation": "A more comprehensive explanation of the news and its potential impact on the stock or market.",
      "language": "The language of the news (either 'English' or 'Hebrew'). Write the content in this language based on the context or if the user's query implies it. If the company is Israeli or the news is local, prefer Hebrew. Otherwise, English.",
      "date": "The date of the news formatted STRICTLY as numbers (e.g., 'DD/MM/YYYY' like '24/10/2023'). Do not use words for months.",
      "sourceUrl": "CRITICAL: You MUST provide the EXACT URL from the Google Search results you used. DO NOT invent or guess URLs. If you cannot find the exact URL in the search results, create a Google News search URL instead: 'https://news.google.com/search?q=' followed by the URL-encoded headline.",
      "sourceName": "The name of the news publisher (e.g., 'Bloomberg', 'Reuters', 'כלכליסט').",
      "sentiment": "bullish", // Must be exactly 'bullish', 'bearish', or 'neutral'
      "sentimentReasoning": "Extremely concise (3-6 words) reason for sentiment.",
      "impactScore": 8, // A number between 1 and 10 representing the potential market impact (10 being highest)
      "impactReasoning": "Extremely concise (3-6 words) reason for impact score."
    }
  ]
}

Ensure the news is accurate and reflects the most current market conditions.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              marketSummary: { type: Type.STRING },
              relevantTickers: { type: Type.STRING },
              news: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    headline: { type: Type.STRING },
                    shortSummary: { type: Type.STRING },
                    detailedExplanation: { type: Type.STRING },
                    language: { type: Type.STRING },
                    date: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING },
                    sourceName: { type: Type.STRING },
                    sentiment: { type: Type.STRING },
                    sentimentReasoning: { type: Type.STRING },
                    impactScore: { type: Type.NUMBER },
                    impactReasoning: { type: Type.STRING }
                  },
                  required: ["headline", "shortSummary", "detailedExplanation", "language", "date", "sourceUrl", "sourceName", "sentiment", "sentimentReasoning", "impactScore", "impactReasoning"]
                }
              }
            },
            required: ["news"]
          }
        }
      });

      const text = response.text;
      if (signal.aborted) return;
      
      if (text) {
        try {
          const parsed = JSON.parse(text);
          const parsedNews = parsed.news || [];
          const parsedSummary = parsed.marketSummary || null;
          const parsedTickers = parsed.relevantTickers || '';
          
          if (isLoadMore) {
            setNews(prev => [...prev, ...parsedNews]);
          } else {
            setNews(parsedNews);
            setMarketSummary(parsedSummary);
            
            // If we didn't have hardcoded tickers for this sector, use the ones from Gemini
            if (filters.sector && !filters.ticker && getTickersToFetch(filters) === '' && parsedTickers) {
              fetchStockData(parsedTickers);
            }
          }
        } catch (e) {
          console.error("Failed to parse response", e);
        }
      }

      // Extract grounding URLs
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const urls = chunks
          .map(chunk => chunk.web)
          .filter((web): web is { uri: string; title: string } => !!web && !!web.uri);
        
        if (isLoadMore) {
          setGroundingUrls(prev => {
            const combined = [...prev, ...urls];
            return Array.from(new Map(combined.map(item => [item.uri, item])).values());
          });
        } else {
          const uniqueUrls = Array.from(new Map(urls.map(item => [item.uri, item])).values());
          setGroundingUrls(uniqueUrls);
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        console.log('Fetch aborted');
        return;
      }
      console.error("Error fetching news:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching news.');
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const cancelFetch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsLoadingMore(false);
  };

  const downloadHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en" class="${isDarkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Radar - Export</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
    }
  </script>
</head>
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8 text-${themeColor}-600 dark:text-${themeColor}-400">Market Radar Export</h1>
    <div class="space-y-6">
      ${news.map(item => `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6" dir="${item.language.toLowerCase() === 'hebrew' || item.language === 'עברית' ? 'rtl' : 'ltr'}">
          <div class="flex justify-between items-start mb-2" dir="ltr">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex-1 ${item.language.toLowerCase() === 'hebrew' || item.language === 'עברית' ? 'text-right' : 'text-left'}" dir="${item.language.toLowerCase() === 'hebrew' || item.language === 'עברית' ? 'rtl' : 'ltr'}">${item.headline}</h2>
            <span class="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded shrink-0" dir="ltr">${item.date}</span>
          </div>
          <p class="text-gray-600 dark:text-gray-300 mb-4 ${item.language.toLowerCase() === 'hebrew' || item.language === 'עברית' ? 'text-right' : 'text-left'}">${item.shortSummary}</p>
          <p class="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap mb-4 ${item.language.toLowerCase() === 'hebrew' || item.language === 'עברית' ? 'text-right' : 'text-left'}">${item.detailedExplanation}</p>
          ${item.sourceUrl ? `<a href="${item.sourceUrl}" target="_blank" class="text-${themeColor}-600 dark:text-${themeColor}-400 hover:underline text-sm font-medium">Source: ${item.sourceName || item.sourceUrl}</a>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-radar-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const themeColors: { value: ThemeColor; class: string }[] = [
    { value: 'blue', class: 'bg-blue-600' },
    { value: 'emerald', class: 'bg-emerald-600' },
    { value: 'violet', class: 'bg-violet-600' },
    { value: 'rose', class: 'bg-rose-600' },
  ];

  const t = themeClasses[themeColor];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${t.iconBg}`}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${t.text}`}>
              Market Radar
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Sparkline Range Selector */}
            <div className="relative inline-flex items-center hidden sm:flex">
              <select
                value={sparklineRange}
                onChange={(e) => setSparklineRange(e.target.value as any)}
                className="appearance-none bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white pr-5 cursor-pointer focus:outline-none"
              >
                <option value="1d" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Trend: Past 24 Hours</option>
                <option value="5d" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Trend: Past Week</option>
                <option value="1mo" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Trend: Past Month</option>
              </select>
              <ChevronDown className="absolute right-0 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

            {/* Live Mode Toggle */}
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isLiveMode ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
              title="Toggle Live Auto-Refresh (5m)"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLiveMode ? 'animate-spin-slow' : ''}`} />
              <span className="hidden sm:inline">{isLiveMode ? 'Live' : 'Auto-Refresh'}</span>
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

            {/* Theme Color Selector */}
            <div className="relative" ref={themePickerRef}>
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Change Theme Color"
              >
                <Palette className="w-5 h-5" />
              </button>
              
              {showThemePicker && (
                <div className="absolute right-0 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex space-x-2 z-50">
                  {themeColors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setThemeColor(c.value);
                        setShowThemePicker(false);
                      }}
                      className={`w-6 h-6 rounded-full ${c.class} ${themeColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800' : ''}`}
                      title={`Set theme to ${c.value}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Download HTML */}
            <button
              onClick={downloadHtml}
              disabled={news.length === 0}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.btnText}`}
              title="Download as HTML"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {stockData.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
              {stockData.map((stock) => {
              // Map back to Yahoo Finance symbol for the link
              const symbolMap: Record<string, string> = {
                'TA125': '^TA125.TA',
                'TA90': 'TA90.TA',
                'TA35': 'TA35.TA',
              };
              const querySymbol = symbolMap[stock.symbol] || stock.symbol;
              const yahooUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(querySymbol)}`;

              return (
                <a 
                  key={stock.symbol} 
                  href={yahooUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="View on Yahoo Finance"
                >
                  <ExternalLink className="absolute top-2 right-2 w-3 h-3 text-gray-300 dark:text-gray-600" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                    {stock.symbol}
                  </span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">${stock.currentPrice.toFixed(2)}</span>
                  <div className={`flex items-center text-xs font-medium ${stock.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stock.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.percentChange > 0 ? '+' : ''}{stock.percentChange.toFixed(2)}%)
                  </div>
                  {stock.history && stock.history.length > 0 && (
                    <Sparkline 
                      data={stock.history} 
                      color={stock.change >= 0 ? '#10b981' : '#ef4444'} 
                    />
                  )}
                </a>
              );
            })}
            </div>
          </div>
        )}

        {stockError && (
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start text-amber-800 dark:text-amber-300 text-sm">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <p>{stockError}</p>
          </div>
        )}

        <FilterBar 
          filters={filters} 
          setFilters={setFilters} 
          onSearch={() => fetchNews(false)} 
          onCancel={cancelFetch}
          isLoading={isLoading}
          themeColor={themeColor}
          savedProfiles={savedProfiles}
          onLoadProfile={(profile) => setFilters(profile.filters)}
          onSaveProfileClick={() => setShowSaveModal(true)}
          onDeleteProfile={handleDeleteProfile}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {marketSummary && !isLoading && news.length > 0 && (
          <div className={`mb-6 p-5 rounded-xl border ${t.iconBg.replace('bg-', 'border-')} bg-opacity-10 dark:bg-opacity-20 flex items-start`} dir="auto">
            <Activity className={`w-6 h-6 mr-3 flex-shrink-0 mt-0.5 ${t.text.split(' ')[0]}`} />
            <div>
              <h3 className={`font-semibold mb-1 ${t.text.split(' ')[0]}`}>Market Overview (TL;DR)</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{marketSummary}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Failed to fetch news</h3>
              <p className="text-sm mt-1 opacity-90">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isLoading && news.length === 0 ? (
            // Skeleton loading state
            Array.from({ length: filters.resultCount }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            ))
          ) : news.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4">
                {news.map((item, index) => (
                  <NewsCard 
                    key={index} 
                    item={item} 
                    themeColor={themeColor} 
                    onAskAI={(article) => setActiveChatArticle(article)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
              
              {groundingUrls.length > 0 && (
                <div className="mt-8 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-left" dir="ltr">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-gray-500" />
                    Sources & References
                  </h4>
                  <ul className="space-y-2">
                    {groundingUrls.map((url, index) => (
                      <li key={index}>
                        <a 
                          href={url.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`text-sm hover:underline line-clamp-1 ${t.btnText.split(' ')[0]} ${t.btnText.split(' ')[1]}`}
                        >
                          {url.title || url.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Load More Button */}
              {news.length > 0 && !isLoading && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => fetchNews(true)}
                    disabled={isLoadingMore}
                    className={`flex items-center justify-center px-6 py-3 text-sm font-medium text-white rounded-xl shadow-sm focus:ring-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.loadBtn}`}
                  >
                    {isLoadingMore ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Plus className="w-5 h-5 mr-2" />
                    )}
                    {isLoadingMore ? 'Loading More...' : 'Load More News'}
                  </button>
                </div>
              )}
            </>
          ) : !isLoading && hasFetchedInitial ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No news found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters and search again.</p>
            </div>
          ) : !isLoading && !hasFetchedInitial ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ready to scan the market</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Click "Refresh News" to get the latest updates.</p>
            </div>
          ) : null}
        </div>
      </main>
      {/* Save Profile Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Save Filter Profile</h3>
              <button 
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g., Israeli Tech Stocks"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5"
                  autoFocus
                />
              </div>
              <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefaultProfile}
                  onChange={(e) => setIsDefaultProfile(e.target.checked)}
                  className={`mr-2 w-4 h-4 rounded border-gray-300 focus:ring-2 text-${themeColor}-600 focus:ring-${themeColor}-500`}
                />
                Set as default (load automatically on startup)
              </label>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!newProfileName.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.loadBtn}`}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep Dive Chat Modal */}
      <ChatModal 
        article={activeChatArticle} 
        isOpen={activeChatArticle !== null} 
        onClose={() => setActiveChatArticle(null)} 
        themeColor={themeColor} 
      />
    </div>
  );
}

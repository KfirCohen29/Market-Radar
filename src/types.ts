export interface NewsItem {
  headline: string;
  shortSummary: string;
  detailedExplanation: string;
  language: string;
  date: string;
  sourceUrl: string;
  sourceName: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  impactScore?: number;
  sentimentReasoning?: string;
  impactReasoning?: string;
}

export interface StockData {
  symbol: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  history?: number[];
}

export interface FilterState {
  sortBy: 'relevance' | 'recent';
  sector: string;
  ticker: string;
  resultCount: number;
  date: string;
  market: 'all' | 'tase' | 'international';
  newsType?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
}

export type ThemeColor = 'blue' | 'emerald' | 'violet' | 'rose';

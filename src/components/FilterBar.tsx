import React, { useState } from 'react';
import { Search, Clock, Building2, Tag, Hash, Calendar, Globe, Bookmark, Plus, Newspaper, X, Trash2, LayoutList, LayoutGrid } from 'lucide-react';
import { FilterState, ThemeColor, SavedFilter } from '../types';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onSearch: () => void;
  onCancel: () => void;
  isLoading: boolean;
  themeColor: ThemeColor;
  savedProfiles: SavedFilter[];
  onLoadProfile: (profile: SavedFilter) => void;
  onSaveProfileClick: () => void;
  onDeleteProfile: (id: string) => void;
  viewMode: 'card' | 'compact';
  setViewMode: (mode: 'card' | 'compact') => void;
}

const themeClasses = {
  blue: { bg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 dark:focus:ring-blue-800' },
  emerald: { bg: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300 dark:focus:ring-emerald-800' },
  violet: { bg: 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-300 dark:focus:ring-violet-800' },
  rose: { bg: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300 dark:focus:ring-rose-800' },
};

export function FilterBar({ filters, setFilters, onSearch, onCancel, isLoading, themeColor, savedProfiles, onLoadProfile, onSaveProfileClick, onDeleteProfile, viewMode, setViewMode }: FilterBarProps) {
  const [tickerInput, setTickerInput] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: name === 'resultCount' ? parseInt(value) : value }));
  };

  const tickers = filters.ticker ? filters.ticker.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTicker = () => {
    if (tickerInput.trim()) {
      const newTickers = [...tickers, tickerInput.trim().toUpperCase()];
      setFilters(prev => ({ ...prev, ticker: newTickers.join(',') }));
      setTickerInput('');
    }
  };

  const handleTickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (tickerInput.trim()) {
        addTicker();
      } else if (e.key === 'Enter') {
        onSearch();
      }
    } else if (e.key === 'Backspace' && !tickerInput && tickers.length > 0) {
      const newTickers = tickers.slice(0, -1);
      setFilters(prev => ({ ...prev, ticker: newTickers.join(',') }));
    }
  };

  const removeTicker = (index: number) => {
    const newTickers = tickers.filter((_, i) => i !== index);
    setFilters(prev => ({ ...prev, ticker: newTickers.join(',') }));
  };

  const btnClass = themeClasses[themeColor].bg;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6 text-left transition-colors duration-200" dir="ltr">
      
      {/* Saved Profiles Section */}
      <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Bookmark className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <select
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2 w-full sm:w-64"
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProfileId(val);
              if (val) {
                const profile = savedProfiles.find(p => p.id === val);
                if (profile) onLoadProfile(profile);
              }
            }}
            value={selectedProfileId}
          >
            <option value="" disabled>Load a saved filter...</option>
            {savedProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProfileId && (
            <button
              onClick={() => {
                onDeleteProfile(selectedProfileId);
                setSelectedProfileId('');
              }}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete selected profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onSaveProfileClick}
          className={`flex items-center px-3 py-1.5 text-sm font-medium text-${themeColor}-600 dark:text-${themeColor}-400 hover:bg-${themeColor}-50 dark:hover:bg-${themeColor}-900/20 rounded-lg transition-colors`}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Save Current Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Sort By */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Sort By
          </label>
          <select
            name="sortBy"
            value={filters.sortBy}
            onChange={handleChange}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5"
          >
            <option value="relevance">Relevance / Top</option>
            <option value="recent">Recent / Newly Added</option>
          </select>
        </div>

        {/* Market */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Market
          </label>
          <select
            name="market"
            value={filters.market}
            onChange={handleChange}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5"
          >
            <option value="all">All Markets</option>
            <option value="international">International / Global</option>
            <option value="tase">Tel Aviv (TASE) / Israel</option>
          </select>
        </div>

        {/* Sector */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Sector / Domain
          </label>
          <input
            type="text"
            name="sector"
            value={filters.sector}
            onChange={handleChange}
            placeholder="e.g. Technology, Healthcare..."
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5"
          />
        </div>

        {/* Ticker */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            Company Tickers
          </label>
          <div className="flex flex-wrap items-center gap-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 focus-within:ring-1 focus-within:ring-gray-500 focus-within:border-gray-500">
            {tickers.map((t, index) => (
              <span key={index} className="flex items-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded">
                {t}
                <button
                  type="button"
                  onClick={() => removeTicker(index)}
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <div className="flex-1 flex items-center min-w-[120px]">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                onKeyDown={handleTickerKeyDown}
                placeholder={tickers.length === 0 ? "e.g. AAPL, TSLA (Press Space)" : ""}
                className="flex-1 bg-transparent border-none text-gray-900 dark:text-white text-sm focus:ring-0 p-1 uppercase"
              />
              {tickerInput.trim() && (
                <button
                  type="button"
                  onClick={addTicker}
                  className="p-1 ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded transition-colors"
                  title="Add Ticker"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* News Type */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Newspaper className="w-3.5 h-3.5 mr-1.5" />
            News Type (Optional)
          </label>
          <input
            type="text"
            name="newsType"
            value={filters.newsType || ''}
            onChange={handleChange}
            placeholder="e.g. Earnings, M&A..."
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5"
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Date
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              name="date"
              value={filters.date === 'today' ? '' : filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              disabled={filters.date === 'today'}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5 disabled:opacity-50"
            />
            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={filters.date === 'today'}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.checked ? 'today' : '' }))}
                className={`mr-2 w-4 h-4 rounded border-gray-300 focus:ring-2 text-${themeColor}-600 focus:ring-${themeColor}-500`}
              />
              Today
            </label>
          </div>
        </div>

        {/* Result Count */}
        <div className="space-y-1.5">
          <label className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Hash className="w-3.5 h-3.5 mr-1.5" />
            Results Count
          </label>
          <select
            name="resultCount"
            value={filters.resultCount}
            onChange={handleChange}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block p-2.5"
          >
            <option value={3}>3 Results</option>
            <option value={5}>5 Results</option>
            <option value={10}>10 Results</option>
            <option value={15}>15 Results</option>
            <option value={20}>20 Results</option>
            <option value={30}>30 Results</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            title="Card View"
          >
            <LayoutGrid className="w-4 h-4 mr-1.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            title="Compact View"
          >
            <LayoutList className="w-4 h-4 mr-1.5" />
            Compact
          </button>
        </div>

        {isLoading ? (
          <button
            onClick={onCancel}
            className={`flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white rounded-lg focus:ring-4 transition-colors bg-red-500 hover:bg-red-600 focus:ring-red-300 dark:focus:ring-red-800`}
          >
            <X className="w-4 h-4 mr-2" />
            Stop Loading
          </button>
        ) : (
          <button
            onClick={onSearch}
            disabled={isLoading}
            className={`flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white rounded-lg focus:ring-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
          >
            <Search className="w-4 h-4 mr-2" />
            Refresh News
          </button>
        )}
      </div>
    </div>
  );
}

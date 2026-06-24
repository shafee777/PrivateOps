import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useVault } from '../context/VaultContext';
import { 
  Search as SearchIcon, 
  FileText, 
  Lock, 
  Unlock, 
  Eye, 
  HelpCircle,
  Sparkles,
  TrendingDown,
  Volume2,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { requestUnlock } = useVault();
  
  const queryParam = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(queryParam);

  useEffect(() => {
    setQueryInput(queryParam);
  }, [queryParam]);

  // Execute query against combined search API
  const { data: results = [], isLoading, refetch } = useQuery({
    queryKey: ['search', queryParam],
    queryFn: async () => {
      if (!queryParam) return [];
      const res = await api.get(`/api/search?q=${encodeURIComponent(queryParam)}`);
      return res.data;
    },
    enabled: !!queryParam
  });

  // Preview modals states
  const [previewItem, setPreviewItem] = useState(null);
  const [previewDetails, setPreviewDetails] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (queryInput.trim()) {
      setSearchParams({ q: queryInput.trim() });
    }
  };

  const handleOpenResult = (result) => {
    // If it's a finance record, we don't open the PDF viewer, we can just show details
    if (result.type === 'FINANCE') {
      setPreviewItem(result);
      setPreviewDetails({
        title: result.title,
        type: 'FINANCE',
        description: result.description,
        tags: result.tags,
        created_at: result.created_at
      });
      return;
    }

    const loadDetails = async (tokenHeader = null) => {
      setPreviewLoading(true);
      try {
        const headers = tokenHeader ? { 'x-vault-token': tokenHeader } : {};
        const res = await api.get(`/api/items/${result.original_id}`, { headers });
        setPreviewItem(result);
        setPreviewDetails(res.data);
      } catch (err) {
        alert(err.response?.data?.error || 'Verification failed');
      } finally {
        setPreviewLoading(false);
      }
    };

    if (result.is_locked || result.is_private || result.requires_verification) {
      requestUnlock((token) => loadDetails(token));
    } else {
      loadDetails();
    }
  };

  const formatScore = (score) => {
    return `${Math.round(score * 100)}% Match`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">
          Intelligent Retrieval System
        </h1>
        <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">
          Perform natural queries. Searches notes text, PDF OCR text layers, transcripts, and financial ledgers.
        </p>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="What are you looking for? (e.g. Find travel expenses from April, show my internship certificate)"
          className="w-full py-4 pl-12 pr-4 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base transition-all"
        />
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary font-semibold text-xs px-4 py-2"
        >
          Query Workspace
        </button>
      </form>

      {/* Results Section */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Computing semantic match rankings...</div>
        ) : !queryParam ? (
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-dark-700 rounded-2xl text-center space-y-3 bg-white dark:bg-dark-800/40">
            <Sparkles className="w-12 h-12 text-primary-500/60 mx-auto animate-pulse" />
            <p className="text-sm font-semibold text-slate-500">Your secure memory index is active.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Type your search in natural language. PrivateOps automatically uses vector cosine comparisons to locate matching entries.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <HelpCircle className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No records found matching "{queryParam}".</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your search keywords or upload receipt documents.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results ({results.length})</p>
            <div className="space-y-3">
              {results.map(result => (
                <div 
                  key={result.id}
                  onClick={() => handleOpenResult(result)}
                  className="p-4 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700/80 rounded-xl hover:border-primary-500/40 dark:hover:border-primary-500/35 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-dark-900 text-primary-500 flex items-center justify-center flex-shrink-0">
                      {result.type === 'FINANCE' ? (
                        <TrendingDown className="w-5 h-5 text-rose-500" />
                      ) : result.type === 'VOICE' ? (
                        <Volume2 className="w-5 h-5 text-primary-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary-500" />
                      )}
                    </div>
                    <div className="text-left overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-dark-100 truncate group-hover:text-primary-650">
                          {result.title}
                        </span>
                        {result.score && (
                          <span className="text-[9px] font-extrabold text-primary-650 bg-primary-50 dark:bg-primary-950/20 px-1.5 py-0.5 rounded">
                            {formatScore(result.score)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-dark-400 truncate mt-0.5 max-w-xl">
                        {result.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {result.is_locked && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                    <button className="btn-secondary py-1 px-2.5 text-[10px] font-bold flex items-center gap-1 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-150">
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- PREVIEW MODAL --- */}
      {previewItem && previewDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-dark-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-slate-100 dark:border-dark-700 flex flex-col overflow-hidden max-h-[80vh]"
          >
            <div className="p-4 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between bg-slate-50 dark:bg-dark-900">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-dark-50">{previewDetails.title}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{previewDetails.type} • Vault Record</p>
              </div>
              <button 
                onClick={() => { setPreviewItem(null); setPreviewDetails(null); }}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 dark:text-dark-300">
              {previewDetails.type === 'FINANCE' ? (
                // Finance transaction details
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-dark-900 rounded-xl space-y-3 border border-slate-200/50 dark:border-dark-700/60">
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Transaction Info</span>
                      <span className="font-bold text-lg text-rose-500">{previewDetails.title}</span>
                    </div>
                    <p className="font-medium text-slate-700 dark:text-dark-350">{previewDetails.description}</p>
                  </div>
                </div>
              ) : previewDetails.type === 'NOTE' ? (
                // Rich Text note markdown content
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-dark-900 p-4 rounded-xl border border-slate-200/50 dark:border-dark-700/60 min-h-[150px] overflow-y-auto">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Note Content</p>
                    <p className="whitespace-pre-wrap font-mono leading-relaxed text-slate-700 dark:text-dark-250">
                      {previewDetails.details?.content || 'Empty note content.'}
                    </p>
                  </div>
                </div>
              ) : (
                // Document embeds
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document File</span>
                    {previewDetails.type === 'VOICE' ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-900 flex flex-col items-center justify-center gap-4 text-center border border-slate-200/50 dark:border-dark-700/60">
                        <Volume2 className="w-12 h-12 text-primary-500" />
                        <audio controls src={previewDetails.file_url} className="w-full" />
                      </div>
                    ) : previewDetails.type === 'PDF' ? (
                      <iframe src={`${previewDetails.file_url}#toolbar=0`} className="w-full h-64 rounded-xl border border-slate-200/50 dark:border-dark-700" title={previewDetails.title} />
                    ) : (
                      <img src={previewDetails.file_url} alt={previewDetails.title} className="w-full h-64 object-contain rounded-xl border border-slate-200/50 dark:border-dark-700 bg-slate-50 dark:bg-dark-900" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200/50 dark:border-dark-700/60 max-h-32 overflow-y-auto">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">OCR Status & Summary</span>
                      <p className="italic">{previewDetails.details?.document?.summary || 'No summary compiled.'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200/50 dark:border-dark-700/60 max-h-32 overflow-y-auto">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Full Text Extracted</span>
                      <p className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-slate-500 dark:text-dark-400">
                        {previewDetails.extracted_text || 'No text extracted.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {previewDetails.tags?.map((tag, idx) => (
                  <span key={idx} className="bg-primary-500/10 text-primary-650 px-2 py-0.5 rounded font-bold text-[10px]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Search;

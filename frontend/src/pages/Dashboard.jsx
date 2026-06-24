import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  FileText, 
  File, 
  DollarSign, 
  Activity, 
  ArrowRight, 
  Search, 
  ShieldAlert, 
  PlusCircle, 
  Sparkles,
  GraduationCap,
  Briefcase,
  PiggyBank,
  UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Dashboard() {
  const navigate = useNavigate();
  const [focusTopic, setFocusTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Dashboard metrics and activities
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard');
      return res.data;
    }
  });

  useEffect(() => {
    const focus = localStorage.getItem('userFocus');
    if (focus) setFocusTopic(focus);
  }, []);

  const handleSelectFocus = (topic) => {
    localStorage.setItem('userFocus', topic);
    setFocusTopic(topic);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const triggerPresetSearch = (queryStr) => {
    navigate(`/search?q=${encodeURIComponent(queryStr)}`);
  };

  // Loading skeleton helpers
  const statCards = [
    { title: 'Total Notes', count: dashboard?.stats?.notesCount ?? 0, icon: FileText, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/20' },
    { title: 'Vault Documents', count: dashboard?.stats?.documentsCount ?? 0, icon: File, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
    { title: 'Expenses This Month', count: `$${(dashboard?.stats?.monthlyExpenses ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Dynamic Header Greeting & Onboarding Focus Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">
            Personal Intelligence Center
          </h1>
          <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">
            Secure workspace monitor. Local semantic search model is active.
          </p>
        </div>

        {/* Workspace Focus selection */}
        {!focusTopic ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 glass-panel rounded-2xl flex flex-col md:flex-row items-center gap-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-dark-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Focus Today:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Education', icon: GraduationCap },
                { name: 'Career', icon: Briefcase },
                { name: 'Finance', icon: PiggyBank },
                { name: 'Personal', icon: UserCheck }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => handleSelectFocus(item.name)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 dark:bg-dark-700 dark:hover:bg-dark-600 border border-slate-200 dark:border-dark-650 rounded-lg text-xs font-semibold text-slate-700 dark:text-dark-200 flex items-center gap-1 transition-all active:scale-95"
                >
                  <item.icon className="w-3.5 h-3.5" /> {item.name}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="p-3 bg-primary-500/10 dark:bg-primary-950/20 border border-primary-500/20 rounded-xl flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
              {focusTopic === 'Education' && <GraduationCap className="w-4 h-4" />}
              {focusTopic === 'Career' && <Briefcase className="w-4 h-4" />}
              {focusTopic === 'Finance' && <PiggyBank className="w-4 h-4" />}
              {focusTopic === 'Personal' && <UserCheck className="w-4 h-4" />}
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Workspace focus</p>
              <p className="text-xs font-bold text-slate-800 dark:text-dark-100">{focusTopic} Workspace</p>
            </div>
            <button 
              onClick={() => handleSelectFocus('')} 
              className="text-[10px] text-primary-500 hover:underline font-bold pl-2 border-l border-slate-200 dark:border-dark-700"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Main Core Search Bar Section */}
      <div className="p-8 bg-gradient-to-tr from-slate-900 to-slate-950 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden text-center space-y-6">
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <h2 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
            What can I retrieve for you today?
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Search across your notes, PDF contents, voice note transcripts, and expense categories.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Find travel expenses from April, Aadhaar card, DBMS notes..."
              className="w-full py-4 pl-12 pr-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <button 
              type="submit" 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors active:scale-95"
            >
              Search
            </button>
          </form>
        </div>

        {/* Preset Prompt Cards */}
        <div className="max-w-4xl mx-auto relative z-10">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Try asking these queries</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { text: 'Show my internship certificate', label: 'Certificate Retrieval' },
              { text: 'Find notes about DBMS indexing', label: 'Study Search' },
              { text: 'Find travel expenses from April', label: 'Finance ledger' }
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => triggerPresetSearch(preset.text)}
                className="p-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700/60 rounded-xl text-left transition-all duration-200 group hover:-translate-y-0.5 active:translate-y-0"
              >
                <p className="text-[9px] text-primary-400 font-bold uppercase tracking-wider mb-1">{preset.label}</p>
                <p className="text-xs font-medium text-slate-300 group-hover:text-white truncate">"{preset.text}"</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-dark-50">
                  {isLoading ? (
                    <span className="inline-block w-16 h-6 bg-slate-200 dark:bg-dark-700 rounded animate-pulse" />
                  ) : (
                    card.count
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Recent Uploads & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Recent Uploads */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-dark-50 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary-500" /> Recent Vault Uploads
            </h3>
            <button 
              onClick={() => navigate('/vault')}
              className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
            >
              Explore Vault <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-dark-700/80">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="py-3 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-dark-700 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="w-1/3 h-4 bg-slate-200 dark:bg-dark-700 rounded animate-pulse" />
                    <div className="w-1/4 h-3 bg-slate-200 dark:bg-dark-700 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : dashboard?.recentItems?.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No files uploaded yet.</p>
            ) : (
              dashboard?.recentItems?.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 dark:text-dark-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.type} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(item.is_private || item.requires_verification) && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        Locked
                      </span>
                    )}
                    <button 
                      onClick={() => navigate(item.type === 'NOTE' ? `/notes` : `/vault`)}
                      className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-dark-100 font-semibold p-1 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Activity Log Timeline */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-dark-50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Recent Activity Logs
            </h3>
            <button 
              onClick={() => navigate('/timeline')}
              className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
            >
              All Activity <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-dark-700">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-dark-700 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="w-1/2 h-3.5 bg-slate-200 dark:bg-dark-700 rounded animate-pulse" />
                    <div className="w-1/4 h-2.5 bg-slate-200 dark:bg-dark-700 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : dashboard?.recentActivities?.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No activities recorded yet.</p>
            ) : (
              dashboard?.recentActivities?.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 text-left relative z-10">
                  <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px]">⚡</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-dark-100">
                      {activity.action_type.replace('_', ' ')}{' '}
                      <span className="text-slate-400 font-normal">
                        ({activity.metadata?.title || activity.entity_type})
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

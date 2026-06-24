import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { 
  LayoutDashboard, 
  FolderLock, 
  BookOpen, 
  Wallet, 
  Search, 
  History, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Lock, 
  Unlock,
  ShieldCheck
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { isUnlocked, timeLeft, lock, requestUnlock } = useVault();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Initial theme check
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/vault', label: 'Knowledge Vault', icon: FolderLock },
    { to: '/notes', label: 'Notes Board', icon: BookOpen },
    { to: '/finance', label: 'Finance Tracker', icon: Wallet },
    { to: '/search', label: 'Global Search', icon: Search },
    { to: '/timeline', label: 'Activities', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  // Helper to format remaining time
  const formatTimeLeft = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="w-64 flex flex-col h-screen border-r border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-dark-100 flex-shrink-0 transition-all duration-200">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-dark-700">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary-600 to-sky-400 bg-clip-text text-transparent">
            PrivateOps
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Secure Workspace</p>
        </div>
      </div>

      {/* Vault Status Indicator */}
      <div className="p-4 mx-4 my-3 rounded-xl border border-slate-100 dark:border-dark-700/80 bg-slate-50 dark:bg-dark-900/40 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-dark-400 font-medium">Vault Status:</span>
          {isUnlocked ? (
            <span className="flex items-center text-[10px] bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Unlocked
            </span>
          ) : (
            <span className="flex items-center text-[10px] bg-slate-200 text-slate-700 dark:bg-dark-700 dark:text-dark-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Locked
            </span>
          )}
        </div>

        {isUnlocked ? (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-400 font-mono">Locking in: {formatTimeLeft(timeLeft)}</span>
            <button 
              onClick={lock}
              className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5 hover:underline"
            >
              <Lock className="w-3 h-3" /> Lock
            </button>
          </div>
        ) : (
          <button 
            onClick={() => requestUnlock(() => {})}
            className="w-full mt-1 py-1.5 bg-primary-600/10 hover:bg-primary-600/20 text-primary-600 dark:text-primary-400 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all"
          >
            <Unlock className="w-3.5 h-3.5" /> Unlock Vault
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive 
                    ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-600 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-700/50 hover:text-slate-900 dark:hover:text-dark-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User Profile & Settings */}
      <div className="p-4 border-t border-slate-100 dark:border-dark-700 space-y-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {darkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${darkMode ? 'bg-primary-600' : 'bg-slate-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-900/40">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-extrabold flex items-center justify-center text-sm uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold truncate text-slate-800 dark:text-dark-100">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            
            <button 
              onClick={logout}
              title="Logout"
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-700 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

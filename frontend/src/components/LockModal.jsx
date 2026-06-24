import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function LockModal() {
  const { isModalOpen, closeModal, unlock, modalError } = useVault();
  const { hasVaultPin } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    await unlock(pin);
    setLoading(false);
    setPin('');
  };

  const handleKeypadClick = (val) => {
    if (pin.length < 6) {
      setPin(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-dark-900/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md overflow-hidden bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-slate-200 dark:border-dark-700"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-dark-700">
            <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
              <ShieldAlert className="w-5 h-5" />
              <span className="font-semibold text-slate-800 dark:text-dark-100">Secure Vault Verification</span>
            </div>
            <button 
              onClick={closeModal}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-dark-50">Enter Vault Credentials</h3>
              <p className="text-sm text-slate-500 dark:text-dark-400">
                {hasVaultPin 
                  ? 'Input your 4-6 digit Master Vault PIN to view protected records.' 
                  : 'Enter your primary account password to access private files.'}
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={hasVaultPin ? '••••••' : 'Enter Password'}
                maxLength={20}
                className="w-full text-center tracking-widest text-2xl font-bold py-3 input-field focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              
              {modalError && (
                <p className="text-xs text-red-500 text-center font-medium flex items-center justify-center gap-1 animate-pulse">
                  ⚠️ {modalError}
                </p>
              )}
            </div>

            {/* Keypad UI - displayed only if Vault PIN is configured */}
            {hasVaultPin && (
              <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadClick(num.toString())}
                    className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-dark-700 dark:hover:bg-dark-600 rounded-xl font-bold text-slate-800 dark:text-dark-100 transition-colors hover:scale-105 active:scale-95 duration-100 text-lg"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="py-3 text-sm text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadClick('0')}
                  className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-dark-700 dark:hover:bg-dark-600 rounded-xl font-bold text-slate-800 dark:text-dark-100 transition-colors hover:scale-105 active:scale-95 duration-100 text-lg"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="py-3 text-sm text-slate-500 font-semibold hover:bg-slate-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
                >
                  ⌫
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !pin}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LockModal;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ShieldCheck, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export function Settings() {
  const { hasVaultPin, setHasVaultPin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSetupPin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (pin.length < 4 || pin.length > 6) {
      return setError('Vault PIN must be between 4 and 6 digits.');
    }

    if (pin !== confirmPin) {
      return setError('PIN entries do not match.');
    }

    setLoading(true);
    try {
      await api.post('/api/auth/vault-pin', { pin });
      setSuccess('Master Vault PIN configured successfully!');
      setHasVaultPin(true);
      setPin('');
      setConfirmPin('');
      localStorage.setItem('hasVaultPin', 'true');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">
          System Settings
        </h1>
        <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">
          Manage your workspace security configurations and master access keys.
        </p>
      </div>

      {/* Vault Pin Section */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-dark-700 pb-4">
          <div className="p-2 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-dark-50 text-sm">Master Vault PIN</h3>
            <p className="text-[10px] text-slate-400">Establish a private credentials lock protecting sensitive notes and documents.</p>
          </div>
        </div>

        {/* PIN Configuration Status Banner */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          hasVaultPin 
            ? 'bg-green-50/50 border-green-200/50 text-green-700 dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-400' 
            : 'bg-amber-50/50 border-amber-200/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
        }`}>
          {hasVaultPin ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vault PIN Active</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-dark-400">
                  Your private notes and documents are protected by your 4-6 digit Vault PIN. You can change it below.
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vault PIN Inactive (Unsecured)</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-dark-400">
                  You haven't set a Vault PIN yet. Private files will fall back to your primary login password. Configure a PIN below to secure them.
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/60 text-xs text-red-600 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200/60 text-xs text-green-600 dark:text-green-400 rounded-lg">
            ✓ {success}
          </div>
        )}

        {/* Change PIN Form */}
        <form onSubmit={handleSetupPin} className="space-y-4 text-xs font-semibold text-slate-500 dark:text-dark-350 max-w-sm">
          <div>
            <label className="block mb-1">Enter New PIN (4-6 digits)</label>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full py-2 input-field text-center tracking-widest text-lg font-bold"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Confirm New PIN</label>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full py-2 input-field text-center tracking-widest text-lg font-bold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-1.5 font-bold"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Configure PIN Lock
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Settings;

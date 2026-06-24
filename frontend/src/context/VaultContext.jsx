import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultToken, setVaultToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0); // countdown in seconds
  
  // State for the global lock modal trigger
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState(null);
  const [modalError, setModalError] = useState('');

  // Check storage on load (resilient across quick page reloads)
  useEffect(() => {
    const token = localStorage.getItem('vaultToken');
    if (token) {
      setVaultToken(token);
      setIsUnlocked(true);
      // Setup remaining time (estimate 3 minutes left)
      setTimeLeft(180);
    }
  }, []);

  // Timer countdown for auto-locking
  useEffect(() => {
    if (!isUnlocked || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          lock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isUnlocked, timeLeft]);

  const unlock = async (pin) => {
    setModalError('');
    try {
      const res = await api.post('/api/auth/vault-unlock', { pin });
      const token = res.data.vaultToken;
      const expiry = res.data.expiresIn || 300;

      localStorage.setItem('vaultToken', token);
      setVaultToken(token);
      setIsUnlocked(true);
      setTimeLeft(expiry);
      setIsModalOpen(false);

      if (pendingCallback) {
        pendingCallback(token);
        setPendingCallback(null);
      }
      return { success: true };
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Incorrect Vault PIN';
      setModalError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const lock = () => {
    localStorage.removeItem('vaultToken');
    setVaultToken(null);
    setIsUnlocked(false);
    setTimeLeft(0);
    console.log('[VaultContext] Vault locked.');
  };

  /**
   * Triggers the lock modal. If vault is already unlocked, triggers callback instantly.
   * @param {Function} onSuccess - Callback received once unlocked. Receives vaultToken.
   */
  const requestUnlock = (onSuccess) => {
    if (isUnlocked && vaultToken) {
      onSuccess(vaultToken);
    } else {
      setPendingCallback(() => onSuccess);
      setModalError('');
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPendingCallback(null);
    setModalError('');
  };

  return (
    <VaultContext.Provider 
      value={{ 
        isUnlocked, 
        vaultToken, 
        timeLeft, 
        unlock, 
        lock, 
        requestUnlock,
        isModalOpen,
        closeModal,
        modalError,
        setModalError
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
export default VaultContext;

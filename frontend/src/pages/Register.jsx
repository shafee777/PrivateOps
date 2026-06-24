import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User } from 'lucide-react';

export function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      return setError('Please fill in all fields.');
    }
    setError('');
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-dark-900 px-4">
      <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-dark-700/50">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">Create workspace</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-dark-400">
            Set up your personal secure database node
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10 input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10 input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 input-field"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center py-2.5 text-sm font-semibold"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-slate-500 dark:text-dark-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary-600 dark:text-primary-400 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

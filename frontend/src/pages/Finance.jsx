import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  FileText, 
  HelpCircle, 
  Wallet,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion } from 'framer-motion';

export function Finance() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    type: 'EXPENSE',
    category: 'Food',
    amount: '',
    note: '',
    transaction_date: new Date().toISOString().split('T')[0],
    receipt_document_id: ''
  });

  // Queries
  const { data: transactions = [], isLoading: loadingT } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/api/finance');
      return res.data;
    }
  });

  const { data: analytics = null } = useQuery({
    queryKey: ['finance_analytics'],
    queryFn: async () => {
      const res = await api.get('/api/finance/analytics');
      return res.data;
    }
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await api.get('/api/items');
      return res.data;
    }
  });

  // Filter Vault PDF/Image files that can serve as Receipts
  const receiptDocuments = items.filter(item => 
    item.type === 'PDF' || item.type === 'IMAGE' || item.type === 'RECEIPT'
  );

  // Mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (txData) => {
      return await api.post('/api/finance', txData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance_analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAddForm(false);
      setForm({
        type: 'EXPENSE',
        category: 'Food',
        amount: '',
        note: '',
        transaction_date: new Date().toISOString().split('T')[0],
        receipt_document_id: ''
      });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/api/finance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance_analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    createTransactionMutation.mutate({
      ...form,
      amount: parseFloat(form.amount)
    });
  };

  // Pie Chart Colors
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const stats = analytics?.currentMonth || { income: 0, expense: 0, savings: 0, savingsRate: 0 };
  const monthlyTimelineData = analytics?.monthlySummary || [];
  const categoryBreakdownData = analytics?.categoryBreakdown || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">
            Personal Ledger & Finance
          </h1>
          <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">
            Track expenses, budget aggregates, and associate vault document receipts.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2 self-start"
        >
          <Plus className="w-4 h-4" /> Log Transaction
        </button>
      </div>

      {/* Grid: Financial Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income This Month</span>
            <p className="text-2xl font-black text-slate-800 dark:text-dark-50">${stats.income.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses This Month</span>
            <p className="text-2xl font-black text-slate-800 dark:text-dark-50">${stats.expense.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Monthly Savings</span>
            <p className="text-2xl font-black text-slate-800 dark:text-dark-50">${stats.savings.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Savings Rate</span>
            <p className="text-2xl font-black text-slate-800 dark:text-dark-50">{stats.savingsRate}%</p>
          </div>
          <div className={`p-3 rounded-xl ${stats.savingsRate > 25 ? 'bg-green-50 text-green-500 dark:bg-green-950/25' : 'bg-amber-50 text-amber-500 dark:bg-amber-950/25'}`}>
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Budget Warning Banner if expenses are high */}
      {stats.expense > stats.income * 0.8 && stats.income > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-slate-850 dark:text-dark-50">Budget Alert: High Burn Rate</h4>
            <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
              Your expenses have exceeded 80% of your current logged income. Consider trimming discretionary categories.
            </p>
          </div>
        </div>
      )}

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1 & 2: Income vs Expense Trend Area Chart */}
        <div className="glass-card p-6 lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-dark-50 text-sm">Monthly Trend Aggregates</h3>
            <p className="text-[10px] text-slate-400">Comparison trend of your earnings against spending (last 6 months).</p>
          </div>
          
          <div className="h-72 w-full text-xs">
            {monthlyTimelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Log transactions to see trends.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-dark-700" />
                  <XAxis dataKey="month_year" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeColor)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#expenseColor)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Column 3: Category Expenses Pie Chart */}
        <div className="glass-card p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-dark-50 text-sm">Monthly Category Breakdown</h3>
            <p className="text-[10px] text-slate-400">Expense breakdown for current calendar month.</p>
          </div>

          <div className="h-60 w-full relative flex items-center justify-center">
            {categoryBreakdownData.length === 0 ? (
              <div className="text-slate-400 text-xs">No expenses logged this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="category"
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Pie Legends */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500">
            {categoryBreakdownData.map((entry, index) => (
              <div key={entry.category} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{entry.category}: ${parseFloat(entry.value).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction History Register Ledger */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-dark-50 text-sm">Transaction Ledger History</h3>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-dark-700">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-100 dark:border-dark-700 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Note</th>
                <th className="p-3">Receipt Document</th>
                <th className="p-3">Amount</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-700/80 font-medium text-slate-700 dark:text-dark-250">
              {loadingT ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-slate-400">Loading ledger...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">No transactions logged.</td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/40">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                        tx.type === 'INCOME' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-green-400' 
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-red-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3">{tx.category}</td>
                    <td className="p-3 max-w-[200px] truncate" title={tx.note}>{tx.note || '-'}</td>
                    <td className="p-3">
                      {tx.receipt_name ? (
                        <a 
                          href={tx.receipt_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-primary-650 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> {tx.receipt_name}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className={`p-3 font-bold ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800 dark:text-dark-50'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => deleteTransactionMutation.mutate(tx.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-dark-700 rounded transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: Add Transaction --- */}
      {showAddForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-dark-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-dark-700 space-y-4"
          >
            <h3 className="font-bold text-slate-800 dark:text-dark-50 text-lg">Log Transaction</h3>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-semibold text-slate-600 dark:text-dark-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input-field py-1.5"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>
                
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field py-1.5"
                  >
                    {form.type === 'EXPENSE' ? (
                      <>
                        <option value="Food">Food / Groceries</option>
                        <option value="Rent">Rent / Housing</option>
                        <option value="Utilities">Utilities (Bills)</option>
                        <option value="Shopping">Shopping / Clothing</option>
                        <option value="Travel">Travel / Transport</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Medical">Medical / Health</option>
                      </>
                    ) : (
                      <>
                        <option value="Salary">Primary Salary</option>
                        <option value="Freelance">Freelance / Gig</option>
                        <option value="Investment">Investment Dividends</option>
                        <option value="Gift">Gifts / Refunds</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="250.00"
                    className="input-field py-1.5 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={form.transaction_date}
                    onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                    className="input-field py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Memo Notes</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Details (e.g. Electricity bill for April)"
                  className="input-field py-1.5"
                />
              </div>

              {/* Receipt attachment connector */}
              <div>
                <label className="block mb-1">Attach Receipt from Vault</label>
                <select
                  value={form.receipt_document_id}
                  onChange={(e) => setForm({ ...form, receipt_document_id: e.target.value })}
                  className="input-field py-1.5"
                >
                  <option value="">No Receipt attached</option>
                  {receiptDocuments.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.title} ({doc.type})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 btn-secondary text-xs py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-xs py-2"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Finance;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useVault } from '../context/VaultContext';
import { 
  Folder, 
  FolderPlus, 
  Upload, 
  FileText, 
  ExternalLink, 
  Download, 
  Trash2, 
  Eye, 
  ChevronRight, 
  ShieldAlert, 
  Lock,
  Volume2,
  FileDigit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Vault() {
  const queryClient = useQueryClient();
  const { requestUnlock, isUnlocked } = useVault();
  
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    type: 'PDF', // PDF, IMAGE, CERTIFICATE, RECEIPT, DOCUMENT, LINK, VOICE
    is_private: false,
    requires_verification: false,
    tags: '',
    link_url: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Preview modal states
  const [previewItem, setPreviewItem] = useState(null);
  const [previewDetails, setPreviewDetails] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return res.data;
    }
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await api.get('/api/items');
      return res.data;
    }
  });

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: async (folderData) => {
      return await api.post('/api/categories', folderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewFolderName('');
      setShowFolderModal(false);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId) => {
      return await api.delete(`/api/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Folder Breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [];
    let currentId = activeCategoryId;
    while (currentId) {
      const cat = categories.find(c => c.id === currentId);
      if (cat) {
        crumbs.unshift(cat);
        currentId = cat.parent_id;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      parent_id: activeCategoryId
    });
  };

  const handleFileUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.title) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('type', uploadForm.type);
    formData.append('category_id', activeCategoryId || '');
    formData.append('is_private', uploadForm.is_private);
    formData.append('requires_verification', uploadForm.requires_verification);
    
    // Process tags
    const tagsArr = uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    formData.append('tags', JSON.stringify(tagsArr));

    if (uploadForm.type === 'LINK') {
      formData.append('link_url', uploadForm.link_url);
    } else if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      await api.post('/api/items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Reset form
      setUploadForm({
        title: '',
        description: '',
        type: 'PDF',
        is_private: false,
        requires_verification: false,
        tags: '',
        link_url: ''
      });
      setSelectedFile(null);
      setShowUploadModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload item');
    } finally {
      setUploadLoading(false);
    }
  };

  const handlePreviewItem = (item) => {
    const loadDetails = async (tokenHeader = null) => {
      setLoadingPreview(true);
      try {
        const headers = tokenHeader ? { 'x-vault-token': tokenHeader } : {};
        const res = await api.get(`/api/items/${item.id}`, { headers });
        setPreviewItem(item);
        setPreviewDetails(res.data);
      } catch (err) {
        alert(err.response?.data?.error || 'Verification failed');
      } finally {
        setLoadingPreview(false);
      }
    };

    if (item.is_private || item.requires_verification) {
      // Prompt PIN verification modal
      requestUnlock((token) => loadDetails(token));
    } else {
      loadDetails();
    }
  };

  // Filter categories and items visible in the current folder
  const currentSubFolders = categories.filter(c => c.parent_id === activeCategoryId);
  const currentItems = items.filter(i => i.category_id === activeCategoryId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">
            Knowledge Vault
          </h1>
          <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">
            Store documents, certificates, links, or notes in folders.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowFolderModal(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs font-semibold py-2"
          >
            <FolderPlus className="w-4 h-4" /> New Folder
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2"
          >
            <Upload className="w-4 h-4" /> Upload File
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-dark-400 py-2 border-b border-slate-200/50 dark:border-dark-700/50">
        <button 
          onClick={() => setActiveCategoryId(null)}
          className="hover:text-primary-500 hover:underline"
        >
          Root Vault
        </button>
        {getBreadcrumbs().map(crumb => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button 
              onClick={() => setActiveCategoryId(crumb.id)}
              className="hover:text-primary-500 hover:underline"
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Folder Grid */}
      {currentSubFolders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {currentSubFolders.map(folder => (
              <div 
                key={folder.id}
                onClick={() => setActiveCategoryId(folder.id)}
                className="p-4 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700/80 rounded-xl hover:border-primary-500/40 dark:hover:border-primary-500/30 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group active:scale-95 duration-100"
              >
                <Folder className="w-10 h-10 text-primary-500 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-bold text-slate-800 dark:text-dark-200 truncate w-full">
                  {folder.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Section */}
      <div className="space-y-3 mt-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Records & Documents</h3>
        
        {loadingItems ? (
          <div className="text-center py-12 text-slate-400">Loading vault records...</div>
        ) : currentItems.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-dark-700 rounded-2xl text-center space-y-3 bg-white dark:bg-dark-800/40">
            <Folder className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-400">This folder is empty.</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline"
            >
              Upload your first document here
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map(item => {
              const isLocked = item.is_locked;
              return (
                <div key={item.id} className="glass-card p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-slate-50 dark:bg-dark-900 rounded-lg text-primary-500 flex-shrink-0">
                        {item.type === 'VOICE' ? <Volume2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex gap-1.5">
                        {isLocked && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Protected
                          </span>
                        )}
                        <span className="text-[9px] font-extrabold bg-slate-100 dark:bg-dark-750 text-slate-500 dark:text-dark-350 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {item.type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-dark-100 truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-dark-400 line-clamp-2 mt-1">
                        {item.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, idx) => (
                        <span key={idx} className="text-[9px] font-semibold bg-primary-500/5 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-dark-700/80 pt-3 text-xs">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewItem(item)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                        title="View Record"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {item.file_url && !isLocked && (
                        <a
                          href={item.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => deleteItemMutation.mutate(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-dark-700 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL 1: Create Category Folder --- */}
      {showFolderModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-dark-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-dark-700 space-y-4"
          >
            <h3 className="font-bold text-slate-800 dark:text-dark-50 text-lg">Create Category Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder Name (e.g. DBMS Notes, Aadhaar)"
                className="input-field"
                required
                autoFocus
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowFolderModal(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 2: Upload File / Add Item --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-dark-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-dark-700 space-y-4 overflow-y-auto max-h-[90vh]"
          >
            <h3 className="font-bold text-slate-800 dark:text-dark-50 text-lg">Add Record to Vault</h3>
            
            <form onSubmit={handleFileUploadSubmit} className="space-y-4 text-xs font-semibold text-slate-600 dark:text-dark-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Item Title</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. Internship Certificate"
                    className="input-field py-1.5"
                  />
                </div>
                
                <div>
                  <label className="block mb-1">Type</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                    className="input-field py-1.5"
                  >
                    <option value="PDF">PDF File</option>
                    <option value="IMAGE">Image File</option>
                    <option value="CERTIFICATE">Certificate File</option>
                    <option value="RECEIPT">Receipt File</option>
                    <option value="DOCUMENT">Other Doc File</option>
                    <option value="LINK">Link / URL</option>
                    <option value="VOICE">Voice Note / Audio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">Description / Memo</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Optional brief summary details..."
                  className="input-field py-1.5"
                  rows={2}
                />
              </div>

              <div>
                <label className="block mb-1">Tags (Comma separated)</label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="education, dbs, important"
                  className="input-field py-1.5"
                />
              </div>

              {uploadForm.type === 'LINK' ? (
                <div>
                  <label className="block mb-1">Web Link (URL)</label>
                  <input
                    type="url"
                    required
                    value={uploadForm.link_url}
                    onChange={(e) => setUploadForm({ ...uploadForm, link_url: e.target.value })}
                    placeholder="https://example.com/topic"
                    className="input-field py-1.5"
                  />
                </div>
              ) : (
                <div>
                  <label className="block mb-1">Select File</label>
                  <input
                    type="file"
                    required={uploadForm.type !== 'VOICE'} // voice notes can simulated
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="input-field py-1.5 cursor-pointer text-slate-400"
                  />
                </div>
              )}

              {/* Private Locks Options */}
              <div className="p-3 bg-slate-50 dark:bg-dark-900/60 rounded-xl space-y-3 border border-slate-200/50 dark:border-dark-700/65">
                <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Security lock parameters
                </p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadForm.is_private}
                      onChange={(e) => setUploadForm({ ...uploadForm, is_private: e.target.checked })}
                      className="rounded text-primary-650"
                    />
                    <span>Is Private Item</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadForm.requires_verification}
                      onChange={(e) => setUploadForm({ ...uploadForm, requires_verification: e.target.checked })}
                      className="rounded text-primary-650"
                    />
                    <span>Requires PIN verification</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 btn-secondary text-xs py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploadLoading}
                  className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1"
                >
                  {uploadLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Upload to Vault'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- MODAL 3: Secure Document Viewer / Preview --- */}
      {previewItem && previewDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-dark-900/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-slate-100 dark:border-dark-700 flex flex-col overflow-hidden max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between bg-slate-50 dark:bg-dark-900">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-dark-50">{previewDetails.title}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{previewDetails.type} • Vault Record</p>
              </div>
              <button 
                onClick={() => { setPreviewItem(null); setPreviewDetails(null); }}
                className="btn-secondary py-1 px-2.5 text-xs"
              >
                Close Viewer
              </button>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Embed Document Media */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Media</p>
                {previewDetails.type === 'VOICE' ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-900 flex flex-col items-center justify-center gap-4 text-center border border-slate-200/50 dark:border-dark-700/60">
                    <Volume2 className="w-12 h-12 text-primary-500 animate-pulse-slow" />
                    {previewDetails.file_url ? (
                      <audio controls src={previewDetails.file_url} className="w-full" />
                    ) : (
                      <p className="text-xs text-slate-400">Audio playback unavailable</p>
                    )}
                  </div>
                ) : previewDetails.type === 'IMAGE' || previewDetails.type === 'CERTIFICATE' || previewDetails.type === 'RECEIPT' ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200/50 dark:border-dark-700/80 max-h-72 flex items-center justify-center bg-slate-50 dark:bg-dark-900">
                    {previewDetails.file_url ? (
                      <img src={previewDetails.file_url} alt={previewDetails.title} className="object-contain max-h-full max-w-full" />
                    ) : (
                      <p className="text-xs text-slate-400 p-8 text-center">Image url missing</p>
                    )}
                  </div>
                ) : previewDetails.type === 'PDF' ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200/50 dark:border-dark-700/80 h-72">
                    {previewDetails.file_url ? (
                      <iframe src={`${previewDetails.file_url}#toolbar=0`} className="w-full h-full" title={previewDetails.title} />
                    ) : (
                      <p className="text-xs text-slate-400 p-8 text-center">PDF url missing</p>
                    )}
                  </div>
                ) : previewDetails.type === 'LINK' ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-900/60 border border-slate-200/50 dark:border-dark-700/80 text-center space-y-3">
                    <ExternalLink className="w-10 h-10 text-primary-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-800 dark:text-dark-100">External Web Link Reference</p>
                    <a 
                      href={previewDetails.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-block text-xs btn-primary font-bold py-1.5"
                    >
                      Open Link
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-dark-900 rounded-xl text-center text-xs text-slate-400">
                    Generic File download options only.
                  </div>
                )}
              </div>

              {/* Right Column: OCR Text Summaries / Details */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI OCR Engine extracted Metadata</p>
                
                <div className="space-y-3 text-xs text-slate-700 dark:text-dark-300">
                  <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200/50 dark:border-dark-700/60">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">OCR Status & Summary</p>
                    <p className="italic">
                      {previewDetails.details?.document?.summary || 'No summary compiled.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200/50 dark:border-dark-700/60 max-h-40 overflow-y-auto">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Full Extracted Text</p>
                    <p className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-600 dark:text-dark-400">
                      {previewDetails.extracted_text || 'No text extracted. OCR pipeline processing might be queued.'}
                    </p>
                  </div>

                  {previewDetails.type === 'VOICE' && (
                    <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200/50 dark:border-dark-700/60 max-h-40 overflow-y-auto">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Voice Transcript</p>
                      <p className="leading-relaxed text-slate-600 dark:text-dark-400 font-mono text-[10px]">
                        {previewDetails.details?.transcript || 'No transcript generated.'}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {previewDetails.tags && previewDetails.tags.length > 0 ? (
                        previewDetails.tags.map((tag, idx) => (
                          <span key={idx} className="bg-primary-500/10 text-primary-650 px-2 py-0.5 rounded font-bold text-[10px]">
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">No tags.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Vault;

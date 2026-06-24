import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useVault } from '../context/VaultContext';
import { 
  Plus, 
  Pin, 
  Archive, 
  Trash2, 
  Search, 
  Lock, 
  Unlock, 
  Heading1, 
  Bold, 
  List, 
  Code,
  Save,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Notes() {
  const queryClient = useQueryClient();
  const { requestUnlock, isUnlocked } = useVault();
  
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [editorState, setEditorState] = useState({
    title: '',
    description: '',
    content: '',
    category_id: '',
    is_private: false,
    requires_verification: false,
    tags: '',
    is_pinned: false,
    is_archived: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return res.data;
    }
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await api.get('/api/items');
      return res.data;
    }
  });

  // Filter out only Note items
  const notes = items.filter(item => {
    if (item.type !== 'NOTE') return false;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Quick mockup filter for pinned/archived properties (using tags or description keywords as state metadata)
    const isArchived = item.tags?.includes('archived');
    if (showArchivedOnly) return isArchived && matchesSearch;
    return !isArchived && matchesSearch;
  });

  // Split into pinned and normal
  const pinnedNotes = notes.filter(n => n.tags?.includes('pinned'));
  const regularNotes = notes.filter(n => !n.tags?.includes('pinned'));

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      return await api.post('/api/items', noteData);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Select new note
      const newId = res.data.itemId;
      handleSelectNote({ id: newId, title: 'New Note', type: 'NOTE' });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, noteData }) => {
      return await api.put(`/api/notes/${id}`, noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/api/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActiveNoteId(null);
    }
  });

  const handleSelectNote = (item) => {
    const fetchNoteContent = async (tokenHeader = null) => {
      try {
        const headers = tokenHeader ? { 'x-vault-token': tokenHeader } : {};
        const res = await api.get(`/api/items/${item.id}`, { headers });
        const data = res.data;
        
        setActiveNoteId(item.id);
        setEditorState({
          title: data.title,
          description: data.description || '',
          content: data.details?.content || '',
          category_id: data.category_id || '',
          is_private: data.is_private,
          requires_verification: data.requires_verification,
          tags: data.tags ? data.tags.filter(t => t !== 'pinned' && t !== 'archived').join(', ') : '',
          is_pinned: data.tags?.includes('pinned') || false,
          is_archived: data.tags?.includes('archived') || false
        });
      } catch (err) {
        alert(err.response?.data?.error || 'Authorization failed');
      }
    };

    if (item.is_private || item.requires_verification) {
      requestUnlock((token) => fetchNoteContent(token));
    } else {
      fetchNoteContent();
    }
  };

  const handleCreateNewNote = () => {
    const defaultData = {
      title: 'Untitled Note',
      description: 'Quick notes description...',
      type: 'NOTE',
      content: '',
      is_private: false,
      requires_verification: false,
      tags: JSON.stringify(['notes'])
    };
    createNoteMutation.mutate(defaultData);
  };

  const handleSave = () => {
    if (!activeNoteId) return;

    // Collect tags, append system states ('pinned', 'archived')
    const finalTags = editorState.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editorState.is_pinned) finalTags.push('pinned');
    if (editorState.is_archived) finalTags.push('archived');

    updateNoteMutation.mutate({
      id: activeNoteId,
      noteData: {
        title: editorState.title,
        description: editorState.description,
        content: editorState.content,
        tags: finalTags,
        is_private: editorState.is_private,
        requires_verification: editorState.requires_verification
      }
    });
  };

  // Helper formatting injectors for markdown
  const insertMarkdown = (syntax) => {
    const textarea = document.getElementById('note-textarea');
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = editorState.content;
    const selectedText = text.substring(startPos, endPos);
    
    let replacement = '';
    if (syntax === 'heading') replacement = `\n# ${selectedText || 'Heading'}\n`;
    if (syntax === 'bold') replacement = `**${selectedText || 'bold text'}**`;
    if (syntax === 'list') replacement = `\n- ${selectedText || 'List item'}\n`;
    if (syntax === 'code') replacement = `\n\`\`\`javascript\n${selectedText || '// code blocks'}\n\`\`\`\n`;

    const newContent = text.substring(0, startPos) + replacement + text.substring(endPos);
    setEditorState({ ...editorState, content: newContent });
    
    // Focus back
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + replacement.length, startPos + replacement.length);
    }, 50);
  };

  return (
    <div className="flex-1 flex gap-6 min-h-0 text-left max-w-7xl mx-auto w-full">
      {/* --- Left Column: Notes List --- */}
      <div className="w-80 flex flex-col space-y-4 flex-shrink-0 bg-white dark:bg-dark-800 p-4 border border-slate-200 dark:border-dark-700/80 rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-800 dark:text-dark-50 text-lg">Notes Board</h2>
          <button 
            onClick={handleCreateNewNote}
            className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors active:scale-95"
            title="Create Note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 py-1.5 text-xs"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {/* Archive toggle filter */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{notes.length} Notes found</span>
          <button
            onClick={() => setShowArchivedOnly(!showArchivedOnly)}
            className={`flex items-center gap-1 hover:underline ${showArchivedOnly ? 'text-primary-650' : ''}`}
          >
            <Archive className="w-3.5 h-3.5" /> {showArchivedOnly ? 'View Active' : 'View Archived'}
          </button>
        </div>

        {/* Notes Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading notes...</div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No notes found.</p>
          ) : (
            <>
              {/* Pinned section */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest flex items-center gap-1">
                    <Pin className="w-3 h-3 rotate-45" /> Pinned
                  </p>
                  {pinnedNotes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        activeNoteId === note.id
                          ? 'bg-primary-50/50 dark:bg-primary-950/20 border-primary-500/30'
                          : 'bg-slate-50/40 border-slate-200/50 dark:bg-dark-900/40 dark:border-dark-700/80 hover:bg-slate-50 dark:hover:bg-dark-700'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-800 dark:text-dark-100 truncate">{note.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-dark-400 line-clamp-2 mt-1">{note.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Regular section */}
              {regularNotes.length > 0 && (
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Notes</p>}
                  {regularNotes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        activeNoteId === note.id
                          ? 'bg-primary-50/50 dark:bg-primary-950/20 border-primary-500/30'
                          : 'bg-slate-50/40 border-slate-200/50 dark:bg-dark-900/40 dark:border-dark-700/80 hover:bg-slate-50 dark:hover:bg-dark-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-dark-100 truncate w-3/4">{note.title}</h4>
                        {(note.is_private || note.requires_verification) && <Lock className="w-3 h-3 text-rose-500" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-dark-400 line-clamp-2 mt-1">{note.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- Right Column: Active Note Editor --- */}
      <div className="flex-1 bg-white dark:bg-dark-800 p-6 border border-slate-200 dark:border-dark-700/80 rounded-2xl flex flex-col min-h-0">
        {activeNoteId ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Editor Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditorState({ ...editorState, is_pinned: !editorState.is_pinned })}
                  className={`p-1.5 rounded-lg transition-colors ${editorState.is_pinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-700'}`}
                  title={editorState.is_pinned ? 'Unpin Note' : 'Pin Note'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditorState({ ...editorState, is_archived: !editorState.is_archived })}
                  className={`p-1.5 rounded-lg transition-colors ${editorState.is_archived ? 'text-primary-650 bg-primary-50 dark:bg-primary-950/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-700'}`}
                  title={editorState.is_archived ? 'Activate Note' : 'Archive Note'}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteNoteMutation.mutate(activeNoteId)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-colors"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold"
                >
                  <Save className="w-3.5 h-3.5" /> Save Note
                </button>
              </div>
            </div>

            {/* Note Parameters Form (Title, Description, Folder, Locks) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500 dark:text-dark-350">
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-[10px] uppercase font-bold text-slate-400">Note Title</label>
                  <input
                    type="text"
                    value={editorState.title}
                    onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
                    className="w-full font-bold text-slate-800 dark:text-dark-50 input-field"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[10px] uppercase font-bold text-slate-400">Folder Category</label>
                  <select
                    value={editorState.category_id}
                    onChange={(e) => setEditorState({ ...editorState, category_id: e.target.value })}
                    className="w-full input-field"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-[10px] uppercase font-bold text-slate-400">Brief Description</label>
                  <input
                    type="text"
                    value={editorState.description}
                    onChange={(e) => setEditorState({ ...editorState, description: e.target.value })}
                    placeholder="Short summary memo..."
                    className="w-full input-field"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-[10px] uppercase font-bold text-slate-400">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={editorState.tags}
                    onChange={(e) => setEditorState({ ...editorState, tags: e.target.value })}
                    placeholder="tag1, tag2"
                    className="w-full input-field"
                  />
                </div>
              </div>
            </div>

            {/* Security Locks Settings */}
            <div className="p-3 bg-slate-50 dark:bg-dark-900/60 rounded-xl border border-slate-200/50 dark:border-dark-700/60 flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-dark-350">
              <span className="font-bold text-[10px] uppercase text-slate-400 flex items-center gap-1 tracking-wider">
                <Lock className="w-3.5 h-3.5 text-rose-500" /> Vault Security Configuration
              </span>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editorState.is_private}
                  onChange={(e) => setEditorState({ ...editorState, is_private: e.target.checked })}
                  className="rounded text-primary-650"
                />
                <span>Private Card</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editorState.requires_verification}
                  onChange={(e) => setEditorState({ ...editorState, requires_verification: e.target.checked })}
                  className="rounded text-primary-650"
                />
                <span>Requires verification before opening</span>
              </label>
            </div>

            {/* Markdown Helper Formatting Toolbar */}
            <div className="flex items-center gap-1.5 border-t border-b border-slate-100 dark:border-dark-700/80 py-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-2">Assisted Format:</span>
              <button 
                type="button" 
                onClick={() => insertMarkdown('heading')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-dark-700 rounded text-slate-500 dark:text-dark-300"
                title="Insert Heading"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={() => insertMarkdown('bold')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-dark-700 rounded text-slate-500 dark:text-dark-300"
                title="Insert Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={() => insertMarkdown('list')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-dark-700 rounded text-slate-500 dark:text-dark-300"
                title="Insert List"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={() => insertMarkdown('code')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-dark-700 rounded text-slate-500 dark:text-dark-300"
                title="Insert Code block"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>

            {/* Note Textarea Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              <textarea
                id="note-textarea"
                value={editorState.content}
                onChange={(e) => setEditorState({ ...editorState, content: e.target.value })}
                placeholder="Write your note markdown here..."
                className="w-full flex-1 p-4 bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-dark-700/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono text-xs leading-relaxed overflow-y-auto resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <FolderOpen className="w-12 h-12 text-slate-300 dark:text-dark-700" />
            <p className="text-sm font-medium text-slate-400 dark:text-dark-500">
              Select a note from the panel to edit, or click the plus button to create a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notes;

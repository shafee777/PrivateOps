import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  History, 
  FileText, 
  File, 
  PlusCircle, 
  Trash2, 
  DollarSign, 
  ShieldAlert, 
  Unlock,
  KeyRound
} from 'lucide-react';

export function Timeline() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const res = await api.get('/api/activity');
      return res.data;
    }
  });

  const getActionIcon = (actionType) => {
    const act = actionType.toUpperCase();
    if (act.includes('CREATE')) return { icon: PlusCircle, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/20 border-primary-500/20' };
    if (act.includes('EDIT') || act.includes('UPDATE')) return { icon: FileText, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20 border-sky-500/20' };
    if (act.includes('DELETE')) return { icon: Trash2, color: 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-500/20' };
    if (act.includes('FINANCE') || act.includes('ADD')) return { icon: DollarSign, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20' };
    if (act.includes('LOCK')) return { icon: KeyRound, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-500/20' };
    
    return { icon: History, color: 'text-slate-500 bg-slate-50 dark:bg-dark-900 border-slate-200/50' };
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-dark-50 tracking-tight">
          System Activity Timeline
        </h1>
        <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">
          Audit trails monitoring note edits, document access, and PIN unlock verification logs.
        </p>
      </div>

      {/* Timeline Feed Card */}
      <div className="glass-card p-6 relative">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Fetching system audit trail...</div>
        ) : logs.length === 0 ? (
          <p className="text-slate-400 text-center py-12 text-xs">No activities recorded yet.</p>
        ) : (
          <div className="relative border-l-2 border-slate-100 dark:border-dark-700 ml-4 pl-6 space-y-6">
            {logs.map((log) => {
              const { icon: Icon, color } = getActionIcon(log.action_type);
              
              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Event Node Circle bubble */}
                  <span className={`absolute -left-10 top-0.5 w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 z-10 transition-transform group-hover:scale-105 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-850 dark:text-dark-100 uppercase tracking-wide">
                        {log.action_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-dark-400">
                      Entity Type: <span className="font-semibold text-slate-700 dark:text-dark-250">{log.entity_type}</span> (ID: {log.entity_id})
                    </div>

                    {log.metadata && (
                      <div className="mt-1 bg-slate-50 dark:bg-dark-900/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-dark-700/60 font-mono text-[9px] text-slate-500 dark:text-dark-400 max-w-md">
                        {Object.entries(log.metadata).map(([key, val]) => (
                          <div key={key}>
                            <span className="font-bold text-primary-650">{key}:</span> {typeof val === 'object' ? JSON.stringify(val) : val.toString()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Timeline;

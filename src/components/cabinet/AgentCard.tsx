'use client';

import { useState } from 'react';
import { Bot, Loader2, PlayCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function AgentCard() {
  const [running, setRunning] = useState(false);
  const [agentLog, setAgentLog] = useState<any[] | null>(null);
  const [lastRunCount, setLastRunCount] = useState<number | null>(null);

  const runAgent = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''}` 
        }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setLastRunCount(data.remindersCreated);
      setAgentLog(data.agentLog);
      toast.success(`${data.remindersCreated} rappel(s) généré(s) par l'IA`);
    } catch (e: any) {
      toast.error('Erreur lors du lancement de l\'agent: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
      <div className="p-5 border-b border-slate-100 bg-blue-50/50 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center shadow-lg shadow-blue-800/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Agent Proactif</h2>
            <p className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
              Exécution autonome : 08h00
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-5 flex flex-col min-h-0 flex-1">
        {!agentLog ? (
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-sm text-slate-600 leading-relaxed text-center mb-6">
              L'agent scanne les échéances à venir et les documents manquants, puis génère des rappels via l'IA Groq.
            </p>
            <Button 
              onClick={runAgent} 
              disabled={running} 
              className="w-full bg-blue-800 hover:bg-blue-900"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse en cours...</>
              ) : (
                <><PlayCircle className="w-4 h-4 mr-2" /> Lancer maintenant</>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-sm font-semibold text-slate-900">Résultat ({lastRunCount} envois)</span>
              <Button variant="ghost" size="sm" onClick={() => setAgentLog(null)} className="h-6 text-xs px-2">Fermer</Button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-3">
              {agentLog.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Aucune tâche urgente nécessitant un rappel.</p>
              ) : (
                <div className="space-y-3">
                  {agentLog.map((log, i) => (
                    <div key={i} className="text-xs border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                      <p className="font-medium text-slate-200">{log.client} <span className="text-blue-400 font-normal">({log.obligation})</span></p>
                      <p className="text-slate-400 mt-1 truncate" title={log.messagePreview}>{log.messagePreview}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

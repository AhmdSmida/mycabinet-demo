'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FiscalObligation, Document } from '@/types/database';
import { OBLIGATION_TYPES, getDaysUntilDue, getUrgencyLevel, URGENCY_STYLES } from '@/lib/fiscal/obligations';
import { Loader2, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, FilePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type EnrichedObligation = FiscalObligation & {
  missingDocs: string[];
  daysUntil: number;
  urgency: keyof typeof URGENCY_STYLES;
};

export default function ClientCalendarPage() {
  const { user } = useAuth();
  const supabase = createClient();
  
  const [obligations, setObligations] = useState<EnrichedObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch obligations
    const { data: obsData, error: obsError } = await supabase
      .from('fiscal_obligations')
      .select('*')
      .eq('client_id', user.id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    // Fetch validated documents to check for missing ones
    const { data: docsData } = await supabase
      .from('documents')
      .select('category, status')
      .eq('client_id', user.id)
      .eq('status', 'validated');

    if (obsError) {
      toast.error('Erreur lors du chargement du calendrier');
      setLoading(false);
      return;
    }

    const uploadedCategories = new Set(docsData?.map((d: any) => d.category));
    
    const enriched = (obsData || []).map((ob: any) => {
      const typeInfo = OBLIGATION_TYPES[ob.type as keyof typeof OBLIGATION_TYPES];
      const reqDocs = typeInfo?.required_docs || [];
      const daysUntil = getDaysUntilDue(ob.due_date);
      
      return {
        ...ob,
        missingDocs: reqDocs.filter(doc => !uploadedCategories.has(doc)),
        daysUntil,
        urgency: ob.status === 'completed' ? 'normal' : getUrgencyLevel(daysUntil),
      };
    });

    setObligations(enriched);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkCompleted = async (id: string) => {
    try {
      // Optimistic update
      setObligations(prev => prev.map(ob => 
        ob.id === id ? { ...ob, status: 'completed', urgency: 'normal' } : ob
      ));

      const { error } = await supabase
        .from('fiscal_obligations')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Obligation marquée comme complétée');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      fetchData(); // revert
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Start on Monday
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasObligation = obligations.filter(ob => ob.due_date === dateStr);
      days.push({ day: i, dateStr, obligations: hasObligation });
    }
    
    return days;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mon Calendrier</h1>
          <p className="text-sm text-slate-500 mt-1">Vos prochaines échéances fiscales et sociales</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mini Calendar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 mb-2">
              <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((dateObj, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center relative",
                    dateObj ? "hover:bg-slate-50 border border-transparent hover:border-slate-100" : "opacity-0"
                  )}
                >
                  {dateObj && (
                    <>
                      <span className={cn(
                        "text-sm font-medium z-10",
                        dateObj.dateStr === new Date().toISOString().split('T')[0] ? "bg-blue-800 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-slate-700"
                      )}>
                        {dateObj.day}
                      </span>
                      {dateObj.obligations.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {dateObj.obligations.slice(0, 3).map((ob, j) => (
                            <div key={j} className={cn("w-1.5 h-1.5 rounded-full", URGENCY_STYLES[ob.urgency].dot)} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Prochaines échéances</h2>
            <div className="space-y-3">
              {obligations.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                  <p className="text-slate-500 text-sm">Aucune échéance à venir</p>
                </div>
              ) : (
                obligations.map((ob) => {
                  const typeInfo = OBLIGATION_TYPES[ob.type as keyof typeof OBLIGATION_TYPES] || { icon: '📅' };
                  const styles = URGENCY_STYLES[ob.urgency];
                  const isCompleted = ob.status === 'completed';

                  return (
                    <div 
                      key={ob.id} 
                      className={cn(
                        "bg-white rounded-xl shadow-sm border-l-4 p-4 transition-all",
                        styles.border,
                        isCompleted ? "opacity-75 border-green-500" : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", styles.bg)}>
                            <span className="text-xl">{typeInfo.icon}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{ob.label}</h3>
                              {isCompleted ? (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Complété
                                </span>
                              ) : (
                                <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border", styles.badge)}>
                                  {ob.daysUntil < 0 ? 'En retard' : `J-${ob.daysUntil}`}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              Échéance le {new Date(ob.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            
                            {!isCompleted && ob.missingDocs.length > 0 && (
                              <div className="mt-3 flex items-start gap-2 text-orange-600 bg-orange-50 p-2 rounded-md border border-orange-100">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                  <span className="font-semibold">Documents manquants : </span>
                                  {ob.missingDocs.join(', ')}
                                  <Link href="/client/documents" className="block mt-1 text-orange-700 underline font-medium flex items-center gap-1 hover:text-orange-800">
                                    <FilePlus className="w-3 h-3" />
                                    Uploader maintenant
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {!isCompleted && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="shrink-0 h-8 text-xs"
                            onClick={() => handleMarkCompleted(ob.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Compléter
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

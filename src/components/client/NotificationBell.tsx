'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Reminder } from '@/types/database';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const supabase = createClient();
  
  const unreadCount = reminders.filter(r => !r.read_at).length;

  const fetchReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('client_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(20);
      
    if (data) setReminders(data);
  };

  useEffect(() => {
    fetchReminders();
    
    // Subscribe to new reminders via Supabase Realtime
    const channel = supabase
      .channel('reminders-channel')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'reminders' }, 
        () => fetchReminders()
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Optimistic update
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, read_at: new Date().toISOString() } : r
    ));
    
    await supabase.from('reminders').update({ read_at: new Date().toISOString() }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = reminders.filter(r => !r.read_at).map(r => r.id);
    if (!unreadIds.length) return;

    setReminders(prev => prev.map(r => ({ ...r, read_at: new Date().toISOString() })));
    await supabase.from('reminders').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-9 h-9 text-slate-500 hover:bg-slate-100 rounded-full">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1 min-h-0 bg-slate-50">
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">Aucune notification</p>
              <p className="text-xs text-slate-500 mt-1">Vous êtes à jour dans vos tâches.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reminders.map((r) => {
                const isUnread = !r.read_at;
                
                return (
                  <div 
                    key={r.id} 
                    className={cn(
                      "p-4 flex gap-3 transition-colors",
                      isUnread ? "bg-white" : "bg-slate-50/50 opacity-75"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      r.type === 'missing_doc' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {r.type === 'missing_doc' ? <Clock className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm text-slate-900 leading-snug whitespace-pre-wrap", isUnread ? "font-medium" : "font-normal")}>
                        {r.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-500">
                          {new Date(r.sent_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        
                        {isUnread && (
                          <button 
                            onClick={(e) => markAsRead(r.id, e)}
                            className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                          >
                            <Check className="w-3 h-3" />
                            Lu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

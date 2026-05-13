'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Send, User, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requiresDisclaimer } from '@/lib/ai/guardrails';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SUGGESTED_QUESTIONS = [
  "Quand est ma prochaine déclaration TVA ?",
  "Quels documents dois-je préparer ?",
  "Quel est mon taux de TVA ?",
  "Comment déclarer mes frais de déplacement ?",
];

export default function AssistantPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    if (!user) return;
    
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        setMessages(data.reverse()); // Put chronologically
      }
      setInitialLoading(false);
    };
    
    fetchHistory();
  }, [supabase, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || loading) return;
    
    const userMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur s'est produite lors de la communication avec l'assistant. Réessayez dans un instant." }]);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 absolute inset-0 pt-14 pb-[136px]">
      {/* Header handled by Layout usually, but we keep this clean list */}
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Bot className="w-6 h-6 text-blue-800" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900">Assistant MyCabinet</h1>
          <p className="text-xs text-slate-500">Alimenté par l'IA (Groq Llama-3.3)</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {initialLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-blue-800" />
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-lg">Comment puis-je vous aider ?</p>
              <p className="text-slate-500 text-sm mt-1 max-w-xs">
                Je connais vos échéances et vos documents. Posez-moi vos questions.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm mt-4">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const showDisclaimer = !isUser && requiresDisclaimer(msg.content);

            return (
              <div key={idx} className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mb-1">
                    <Bot className="w-5 h-5 text-blue-800" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  isUser 
                    ? "bg-blue-800 text-white rounded-br-none" 
                    : "bg-white text-slate-800 rounded-bl-none border border-gray-100"
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  
                  {showDisclaimer && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-start gap-1.5 text-orange-600 text-[10px] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Vérifiez ces informations avec votre comptable.</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mb-1">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mb-1">
              <Bot className="w-5 h-5 text-blue-800" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white transition-all"
            placeholder="Posez votre question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={!input.trim() || loading}
            size="icon"
            className="w-12 h-12 rounded-full bg-blue-800 hover:bg-blue-900 shrink-0 shadow-md"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

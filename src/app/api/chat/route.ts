import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isOutOfScope } from '@/lib/ai/guardrails';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages } = await request.json();
  const lastMessage = messages.at(-1)?.content || '';

  if (isOutOfScope(lastMessage)) {
    return NextResponse.json({ message: "Cette question dépasse mon périmètre. Je vous recommande de contacter directement votre comptable pour ce sujet." });
  }

  // Fetch client's real data for context
  const [{ data: profile }, { data: obligations }, { data: documents }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('fiscal_obligations')
      .select('type, label, due_date, status, required_docs')
      .eq('client_id', user.id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(10),
    supabase.from('documents')
      .select('category, status, original_name, created_at')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Build compact context (token-optimized)
  const today = new Date().toISOString().split('T')[0];
  const upcomingObligations = obligations?.map(ob => {
    const daysUntil = Math.ceil((new Date(ob.due_date).getTime() - Date.now()) / 86400000);
    return `- ${ob.type} "${ob.label}": échéance ${ob.due_date} (dans ${daysUntil}j), statut: ${ob.status}`;
  }).join('\n') || 'Aucune échéance à venir';

  const docSummary = documents?.reduce((acc: Record<string, number>, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});
  const docContext = Object.entries(docSummary || {}).map(([cat, count]) => `${cat}: ${count}`).join(', ') || 'Aucun document';

  const pendingDocs = documents?.filter(d => d.status === 'pending').length || 0;
  const validatedDocs = documents?.filter(d => d.status === 'validated').length || 0;

  const systemPrompt = `Tu es l'assistant virtuel de MyCabinet, un portail client pour cabinets comptables. Tu aides ${profile?.full_name || 'le client'} à comprendre ses obligations fiscales, suivre ses documents, et préparer ses déclarations.

**Données du client en temps réel (aujourd'hui: ${today})**:

Prochaines échéances fiscales:
${upcomingObligations}

Documents déposés: ${docContext}
En attente de validation: ${pendingDocs} | Validés: ${validatedDocs}

**Instructions**:
- Réponds TOUJOURS en français, de façon concise et claire.
- Utilise les vraies données ci-dessus dans tes réponses (ne pas inventer de dates ou montants).
- Pour les questions hors périmètre comptable/fiscal, réponds: "Cette question dépasse mon périmètre. Je vous recommande de contacter directement votre comptable pour ce sujet."
- Ne fournis jamais de conseil fiscal définitif — tu es un assistant d'information, pas un expert-comptable agréé.
- Si on te demande une date d'échéance précise, utilise les données ci-dessus.
- Sois proactif: si tu détectes une échéance proche ou des documents manquants, mentionne-le.`;

  // Validate messages to prevent injection
  const safeMessages = messages
    .filter((m: any) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-10) // Keep last 10 messages for context window
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) })); // Truncate long messages

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...safeMessages],
        max_tokens: 600,
        temperature: 0.3, // Low temp for factual accounting answers
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message || 'Groq API error' }, { status: 500 });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    // Save conversation to DB (async, don't await to speed up response to user)
    Promise.all([
      supabase.from('chat_messages').insert({ client_id: user.id, role: 'user', content: safeMessages.at(-1)?.content }),
      supabase.from('chat_messages').insert({ client_id: user.id, role: 'assistant', content: assistantMessage }),
    ]);

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    return NextResponse.json({ error: 'Network error or Groq is unreachable' }, { status: 500 });
  }
}

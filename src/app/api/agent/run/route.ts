import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Verify this is called by Vercel Cron (or our own scheduled call)
function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('authorization');
  return secret === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: NextRequest) {
  // Allow internal calls (from dashboard "Run agent" button) or cron
  const authHeader = request.headers.get('authorization');
  const isCron = verifyCronSecret(request);
  const isInternal = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  
  if (!isCron && !isInternal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const in10Days = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  // Find all upcoming obligations in next 10 days with status 'upcoming'
  const { data: urgentObligations, error: fetchErr } = await adminClient
    .from('fiscal_obligations')
    .select(`
      *,
      client:profiles!fiscal_obligations_client_id_fkey(id, full_name, email, cabinet_id)
    `)
    .in('status', ['upcoming', 'overdue'])
    .lte('due_date', in10Days); // Also checking overdue tasks since they might still need docs

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const remindersToCreate = [];
  const agentLog = [];

  for (const obligation of urgentObligations || []) {
    // If there is no valid client, skip
    if (!obligation.client) continue;

    const clientId = obligation.client_id;
    const daysUntil = Math.ceil((new Date(obligation.due_date).getTime() - today.getTime()) / 86400000);

    // Check if we already sent a reminder for this obligation in the last 3 days
    const { data: recentReminder } = await adminClient
      .from('reminders')
      .select('id')
      .eq('client_id', clientId)
      .eq('obligation_id', obligation.id)
      .gte('sent_at', new Date(today.getTime() - 3 * 86400000).toISOString())
      .limit(1);

    if (recentReminder && recentReminder.length > 0) continue; // Skip, already reminded

    // Check which required docs are missing (not validated)
    const { data: validatedDocs } = await adminClient
      .from('documents')
      .select('category')
      .eq('client_id', clientId)
      .eq('status', 'validated');

    const uploadedCategories = new Set(validatedDocs?.map(d => d.category) || []);
    const missingDocs = (obligation.required_docs || []).filter((doc: string) => !uploadedCategories.has(doc));

    // If it's more than 10 days away, we skip it (unless it was overdue but lte condition filters that). 
    // Wait, the SQL query gets lte 10 days. So it's fine.

    // Generate personalized message with Groq
    const messagePrompt = `Génère un message de rappel court et amical (2-3 phrases maximum) en français pour ${obligation.client.full_name}.
    
Contexte:
- Obligation: ${obligation.type} - ${obligation.label}
- Échéance: ${obligation.due_date} (dans ${daysUntil} jour(s))
- Documents manquants: ${missingDocs.length > 0 ? missingDocs.join(', ') : 'aucun'}

Le message doit:
1. Mentionner l'échéance spécifique et le nombre de jours restants
2. Si des documents manquent: demander explicitement ces documents
3. Être chaleureux mais professionnel
4. Ne PAS inclure de formule de politesse longue
5. Commencer par "Bonjour [prénom],"

Réponds UNIQUEMENT avec le message, sans guillemets.`;

    try {
      const groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: messagePrompt }],
          max_tokens: 150,
          temperature: 0.4,
        }),
      });

      const groqData = await groqRes.json();
      const message = groqData.choices?.[0]?.message?.content?.trim() || 
        `Bonjour ${obligation.client.full_name}, votre ${obligation.type} arrive dans ${daysUntil} jour(s). ${missingDocs.length > 0 ? `Documents manquants: ${missingDocs.join(', ')}.` : ''}`;

      remindersToCreate.push({
        client_id: clientId,
        obligation_id: obligation.id,
        type: missingDocs.length > 0 ? 'missing_doc' : 'deadline',
        message: message.replace(/^"|"$/g, ''), // Strip quotes just in case
        channel: 'in_app',
      });

      agentLog.push({
        client: obligation.client.full_name,
        obligation: obligation.type,
        daysUntil,
        missingDocs,
        messagePreview: message.slice(0, 80) + '...',
      });
    } catch (e) {
      console.error('Groq fetch failed for agent', e);
    }
  }

  // Batch insert all reminders
  if (remindersToCreate.length > 0) {
    const { error: insertError } = await adminClient.from('reminders').insert(remindersToCreate);
    if (insertError) {
      console.error('Failed to insert reminders', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    remindersCreated: remindersToCreate.length,
    agentLog,
  });
}

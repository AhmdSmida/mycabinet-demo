import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDemo() {
  console.log('🌱 Seeding MyCabinet demo data...');

  // 1. Create demo cabinet
  const { data: cabinet, error: cabinetError } = await supabase.from('cabinets').insert({
    name: 'Cabinet Expertise Comptable Ben Salem',
    siret: '12345678901234',
    address: 'Avenue Habib Bourguiba, Tunis 1001',
  }).select().single();

  if (cabinetError) {
    console.error('Error creating cabinet:', cabinetError);
    return;
  }

  // 2. Create cabinet user (accountant)
  const { data: cabinetAuth, error: cabinetAuthError } = await supabase.auth.admin.createUser({
    email: 'demo.cabinet@mycabinet.tn',
    password: 'demo123456',
    user_metadata: { full_name: 'Mme. Fatma Ben Salem', role: 'cabinet' },
    email_confirm: true,
  });

  if (cabinetAuthError && !cabinetAuthError.message.includes('already registered')) {
    console.error('Error creating cabinet auth:', cabinetAuthError);
  } else if (cabinetAuth?.user) {
    await supabase.from('profiles').update({ cabinet_id: cabinet.id }).eq('id', cabinetAuth.user.id);
  }

  // 3. Create 3 demo clients
  const clientsData = [
    { name: 'M. Ahmed Trabelsi', email: 'ahmed.trabelsi@demo.tn', company: 'Trabelsi Import-Export SARL' },
    { name: 'Mme. Sonia Mansour', email: 'sonia.mansour@demo.tn', company: 'Mansour Consulting' },
    { name: 'M. Karim Jebali', email: 'karim.jebali@demo.tn', company: 'Jebali Tech Solutions' },
  ];

  for (const client of clientsData) {
    const { data: clientAuth, error: clientAuthError } = await supabase.auth.admin.createUser({
      email: client.email,
      password: 'demo123456',
      user_metadata: { full_name: client.name, role: 'client' },
      email_confirm: true,
    });
    
    if (clientAuthError && !clientAuthError.message.includes('already registered')) {
      console.error(`Error creating client ${client.email}:`, clientAuthError);
      continue;
    }
    
    const userId = clientAuth?.user?.id;
    if (!userId) continue;

    await supabase.from('profiles').update({ cabinet_id: cabinet.id }).eq('id', userId);
    await supabase.from('client_assignments').insert({ client_id: userId, cabinet_id: cabinet.id });
    
    // Create fiscal obligations for each client
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    
    await supabase.from('fiscal_obligations').insert([
      {
        client_id: userId, cabinet_id: cabinet.id,
        type: 'TVA', label: `Déclaration TVA ${month < 10 ? '0' + month : month}/${year}`,
        due_date: `${year}-${String(month).padStart(2, '0')}-15`,
        status: 'upcoming', required_docs: ['facture', 'tva'],
      },
      {
        client_id: userId, cabinet_id: cabinet.id,
        type: 'IS', label: `Acompte IS ${year}`,
        due_date: `${year}-${String(Math.min(month + 2, 12)).padStart(2, '0')}-25`,
        status: 'upcoming', required_docs: ['bilan'],
      },
      {
        client_id: userId, cabinet_id: cabinet.id,
        type: 'DSN', label: `DSN ${month < 10 ? '0' + month : month}/${year}`,
        due_date: `${year}-${String(month).padStart(2, '0')}-05`,
        status: 'upcoming', required_docs: ['justificatif'],
      },
    ]);
    
    // Add a few sample documents (metadata only, no actual files)
    await supabase.from('documents').insert([
      {
        client_id: userId, cabinet_id: cabinet.id,
        name: 'Facture fournisseur juin', original_name: 'facture_juin_2025.pdf',
        file_path: `${userId}/placeholder.pdf`,
        category: 'facture', status: 'validated',
        period_month: 6, period_year: year,
      },
      {
        client_id: userId, cabinet_id: cabinet.id,
        name: 'K-bis société', original_name: 'kbis_2025.pdf',
        file_path: `${userId}/placeholder2.pdf`,
        category: 'kbis', status: 'pending',
      },
    ]);
    
    // Add a sample AI reminder
    await supabase.from('reminders').insert({
      client_id: userId,
      type: 'deadline',
      message: `Bonjour ${client.name.split(' ')[1]}, votre déclaration TVA arrive dans 5 jours. Il vous manque encore vos factures de ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][month - 1]}. Merci de les déposer dès que possible.`,
      channel: 'in_app',
    });
  }

  console.log('✅ Demo data seeded!');
  console.log('Cabinet login: demo.cabinet@mycabinet.tn / demo123456');
  console.log('Client login: ahmed.trabelsi@demo.tn / demo123456');
}

seedDemo().catch(console.error);

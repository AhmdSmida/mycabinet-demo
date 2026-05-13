// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type Role = 'cabinet' | 'client';

export type DocumentCategory =
  | 'facture'
  | 'kbis'
  | 'justificatif'
  | 'bilan'
  | 'tva'
  | 'contrat'
  | 'autre';

export type DocumentStatus = 'pending' | 'validated' | 'rejected';

export type ObligationType =
  | 'TVA'
  | 'IS'
  | 'CFE'
  | 'CVAE'
  | 'DSN'
  | 'BNC'
  | 'BIC'
  | 'autre';

export type ObligationStatus = 'upcoming' | 'completed' | 'overdue' | 'na';

export type ReminderType = 'deadline' | 'missing_doc' | 'general';

export type ReminderChannel = 'in_app' | 'email' | 'push';

// ─── Table Interfaces ─────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
  cabinet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cabinet {
  id: string;
  name: string;
  siret: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface ClientAssignment {
  id: string;
  client_id: string;
  cabinet_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  client_id: string;
  cabinet_id: string;
  name: string;
  original_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  period_month: number | null;
  period_year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalObligation {
  id: string;
  client_id: string;
  cabinet_id: string;
  type: ObligationType;
  label: string;
  due_date: string;
  status: ObligationStatus;
  required_docs: string[];
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  client_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  client_id: string;
  obligation_id: string | null;
  type: ReminderType;
  message: string;
  sent_at: string;
  read_at: string | null;
  channel: ReminderChannel;
}

export interface Invitation {
  id: string;
  email: string;
  cabinet_id: string;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// ─── Supabase Database shape (for typed createClient<Database>()) ─────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> &
          Partial<Pick<Profile, 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      cabinets: {
        Row: Cabinet;
        Insert: Omit<Cabinet, 'id' | 'created_at'> &
          Partial<Pick<Cabinet, 'id' | 'created_at'>>;
        Update: Partial<Omit<Cabinet, 'id'>>;
      };
      client_assignments: {
        Row: ClientAssignment;
        Insert: Omit<ClientAssignment, 'id' | 'created_at'> &
          Partial<Pick<ClientAssignment, 'id' | 'created_at'>>;
        Update: Partial<Omit<ClientAssignment, 'id'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> &
          Partial<Pick<Document, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Document, 'id'>>;
      };
      fiscal_obligations: {
        Row: FiscalObligation;
        Insert: Omit<FiscalObligation, 'id' | 'created_at'> &
          Partial<Pick<FiscalObligation, 'id' | 'created_at'>>;
        Update: Partial<Omit<FiscalObligation, 'id'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at'> &
          Partial<Pick<ChatMessage, 'id' | 'created_at'>>;
        Update: Partial<Omit<ChatMessage, 'id'>>;
      };
      reminders: {
        Row: Reminder;
        Insert: Omit<Reminder, 'id' | 'sent_at'> &
          Partial<Pick<Reminder, 'id' | 'sent_at'>>;
        Update: Partial<Omit<Reminder, 'id'>>;
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<Invitation, 'id' | 'created_at' | 'token'> &
          Partial<Pick<Invitation, 'id' | 'created_at' | 'token'>>;
        Update: Partial<Omit<Invitation, 'id'>>;
      };
    };
  };
}

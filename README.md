# MyCabinet — Portail Client pour Cabinets Comptables

## Description
MyCabinet est une application web (PWA) de nouvelle génération conçue pour moderniser la relation entre les cabinets d'expertise comptable et leurs clients. Elle remplace les échanges d'emails fragmentés par un portail unifié où les documents, les échéances et les communications sont centralisés.

La valeur ajoutée principale réside dans son assistant IA intégré et son agent proactif. L'agent surveille continuellement l'état des dossiers, identifie les documents manquants par rapport aux obligations fiscales tunisiennes/françaises (TVA, IS, DSN, etc.), et génère des rappels personnalisés de manière autonome.

## Stack Technique
- Next.js 14 (App Router + PWA)
- Supabase (Database + Auth + Storage + Realtime)
- Groq API (llama-3.3-70b) — Assistant IA + Agent proactif
- Tailwind CSS + shadcn/ui

## Démarrage rapide

### Prérequis
- Node.js 18+
- Compte Supabase (gratuit)
- Clé API Groq (gratuite)

### Installation
```bash
git clone https://github.com/votre-repo/mycabinet.git
cd mycabinet
npm install
cp .env.example .env.local
# Remplissez les variables dans .env.local
```

### Configuration Supabase
1. Créez un projet sur supabase.com
2. Exécutez le code SQL d'initialisation pour créer les tables `cabinets`, `profiles`, `documents`, `fiscal_obligations`, `chat_messages` et `reminders`.
3. Copiez les clés d'API (URL, ANNON, SERVICE_ROLE) dans `.env.local`.

### Données de démo
Cette commande génère un cabinet factice, 3 clients, des échéances fiscales croisées avec des documents, et des historiques de notifications pour peupler le tableau de bord.
```bash
npm run seed
```

### Démarrage
```bash
npm run dev
```

## Comptes de démonstration
Après avoir exécuté le script de seed, vous pouvez utiliser ces comptes :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Cabinet | demo.cabinet@mycabinet.tn | demo123456 |
| Client | ahmed.trabelsi@demo.tn | demo123456 |

## Architecture

Le projet est divisé en plusieurs phases clés :
1. **Socle & Auth** : Middleware Next.js assurant un routage sécurisé entre les rôles `client` et `cabinet`.
2. **PWA Shells** : Une interface mobile-first pour le client avec navigation basse, et un dashboard Desktop complet pour le cabinet.
3. **Gestion Documentaire** : Upload par drag-and-drop sur Supabase Storage, avec auto-catégorisation basée sur le nom du fichier.
4. **Validation Cabinet** : Interface de revue de documents avec un flux de validation / refus interactif.
5. **Calendrier Fiscal** : Moteur de génération d'échéances fiscales standardisées (TVA mensuelle, IS, etc.) et suivi visuel des jours restants.
6. **Agent IA & Rappels** : Une tâche cron Serverless exécutant un script Llama-3.3 pour lire l'état du dossier et notifier pro-activement les clients de leurs retards via Supabase Realtime.

## Agent proactif

L'agent s'exécute chaque jour à 8h via un **Vercel Cron** (`/api/agent/run`). 
Pour des besoins de démonstration ou de test, vous pouvez également le déclencher manuellement via le bouton **"Lancer l'agent maintenant"** directement depuis le dashboard cabinet.

## Déploiement

```bash
vercel deploy --prod
```

**Variables requises (Vercel) :**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `CRON_SECRET` (Chaîne de sécurité aléatoire pour le cron)

> Après le déploiement sur Vercel, vous pouvez peupler la base de données de production :
> `SUPABASE_SERVICE_ROLE_KEY=xxx npm run seed`

---

## 🎬 Script de Démo (5 minutes)

1. **[30s] Cabinet Dashboard** : Connectez-vous en tant que cabinet (`demo.cabinet@mycabinet.tn`). Montrez le tableau de bord avec les KPI, la liste des 3 clients, leurs barres de complétude et les échéances urgentes.
2. **[30s] Invitation** : Cliquez sur le bouton "Inviter" au-dessus de la liste des clients. Entrez une adresse email, générez le lien sécurisé en direct, et montrez comment il est copié.
3. **[30s] Shell Client** : Basculez sur une vue mobile (Inspecteur du navigateur). Connectez-vous avec `ahmed.trabelsi@demo.tn` et naviguez dans la PWA (Accueil, Documents, Assistant).
4. **[1m] Dépôt d'un document** : Allez sur l'onglet Documents côté client. Importez un fichier PDF (ex: facture). Observez son ajout instantané et son auto-catégorisation.
5. **[1m] Calendrier** : Affichez le calendrier. Montrez la déclaration TVA expirant dans 5 jours avec la puce "Documents manquants".
6. **[1m] Assistant IA** : Allez dans l'onglet Assistant. Demandez "Quand est ma prochaine TVA ?". L'IA répondra avec la vraie date stockée en base et mentionnera les documents qu'il manque.
7. **[30s] Agent Proactif (Cabinet)** : Revenez sur l'interface du Cabinet. Cliquez sur "Lancer l'agent maintenant". La console affichera le résumé de Llama-3.3 rédigeant des relances sur-mesure pour chaque client en retard.
8. **[30s] Notification Temps Réel** : Retournez sur l'écran d'Ahmed. La cloche de notification affiche une pastille rouge. En l'ouvrant, la relance personnalisée de l'IA (générée à l'étape 7) apparaît instantanément.

## Quick Reference

| Composant | Route | Fichier Clé |
|-----------|-------|-------------|
| **Auth** | `/login`, `/register` | `src/middleware.ts` |
| **Shell Client** | `/client/*` | `src/app/client/layout.tsx` |
| **Shell Cabinet** | `/cabinet/*` | `src/app/cabinet/layout.tsx` |
| **Docs (Client)** | `/client/documents` | `src/app/api/documents/upload/route.ts` |
| **Docs (Cabinet)**| `/cabinet/documents`| `src/app/api/cabinet/documents/[id]/validate/route.ts` |
| **Calendrier** | `/client/calendar` | `src/lib/fiscal/obligations.ts` |
| **Assistant IA** | `/client/assistant` | `src/app/api/chat/route.ts` |
| **Agent Proactif**| `Cron` → `/api/agent/run`| `src/app/api/agent/run/route.ts` |
| **Dashboard** | `/cabinet/dashboard` | `src/app/api/cabinet/stats/route.ts` |

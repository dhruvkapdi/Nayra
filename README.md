<div align="center">

# 🧠 Nayra

### Enterprise AI Knowledge Assistant — RAG-powered, role-based, beautifully themed

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?logo=react-query&logoColor=white)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

Nayra lets every employee **ask questions in plain English and get instant, cited
answers** from your company's internal documents — policies, SOPs, handbooks,
anything. HR Admins get a full dashboard to manage departments, documents, users,
analytics, and company-wide announcements.

It's a complete, production-shaped reference implementation of a multi-tenant
RAG (Retrieval-Augmented Generation) application: authentication, role-based
access control, vector search, real-time notifications, and a polished,
fully-themeable UI — all built on a modern React + Supabase + Gemini stack.

## ✨ Features

### 💬 AI Chat with Citations
- Ask natural-language questions; Nayra retrieves the most relevant chunks from
  your indexed PDFs via **pgvector** similarity search and answers with **Google
  Gemini**, citing the source document and page number for every claim.
- Handles small talk (`hi`, `thanks`, `ok`) gracefully without triggering a
  document search.

### 🔍 Smart Search
- A dedicated search experience with filters: **date range**, **document name**,
  and (for HR) **department / cross-department search** across the whole
  organization.

### 🏢 Role-Based Multi-Tenant Workspaces
- Each department (Engineering, Finance, Marketing, HR) is an isolated
  **workspace** — employees only see their department's documents, plus
  anything uploaded to the shared **"All"** workspace.
- **HR Admins** get a separate dashboard to switch between, manage, and analyze
  every department.

### 🛡️ HR Admin Dashboard
- **Documents** — upload PDFs to a specific department or to everyone at once;
  automatic chunking + embedding pipeline.
- **Users & Employees** — search, change department, toggle Employee ↔ HR Admin
  role, view per-user chat activity, and **permanently delete accounts**.
- **Analytics** — query volume over the last 7 days, queries by department,
  recent questions feed.
- **Workspaces** — manage department metadata and branding colors.
- **Announcements** — broadcast a message to all employees or a specific
  department; appears instantly in everyone's notification bell.

### 📧 Invitations
- **Single or bulk (CSV) invites** — HR enters a name/email/department, or
  uploads a CSV (`name,email,department`), and Nayra sends real email invites
  via Supabase Auth. New users land directly in the correct department.

### 🔔 Real-Time Notifications
- In-app notification bell with unread badges, live updates via Supabase
  Realtime. Employees are notified automatically when a new document is added
  to their workspace, and whenever HR sends an announcement.

### 🎨 12 Cinematic Background Themes
- A fully theme-able UI — sidebar, topbar, and cards adapt to whichever
  background the user picks in **Settings → Appearance**:
  Midnight Violet, Aurora Borealis, Sunset Ember, Cyber Neon, Low-Poly Emerald,
  Watercolor Bloom, Wave Pastel, Ink Teal Depths, Frosted Glass, Horizon Glow,
  Obsidian Gold, and Crimson Nebula. Preference persists per-user.

### 📱 Fully Responsive
- Mobile-first layout with slide-in drawers, touch-friendly controls, and
  adaptive grids across every page — chat, dashboards, settings, and tables.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, TanStack Start (file-based routing + SSR), Tailwind CSS, Framer Motion |
| Backend | Supabase (Postgres + pgvector, Auth, Storage, Edge Functions, Realtime) |
| AI | Google Gemini — `gemini-embedding-001` (768-dim embeddings) for retrieval, `gemini-2.5-flash` for chat generation |
| Charts | Recharts |

---

## 📂 Project Structure

```
nayra/
├── src/
│   ├── routes/                  # File-based routes (TanStack Start)
│   │   ├── index.tsx            # Employee chat
│   │   ├── smart-search.tsx     # Filtered search
│   │   ├── history.tsx          # Chat history
│   │   ├── team.tsx              # Team / department view
│   │   ├── settings.tsx         # Profile + Appearance themes
│   │   ├── hr-dashboard.tsx     # HR Admin dashboard (all tabs)
│   │   ├── login.tsx / signup.tsx
│   │   └── __root.tsx           # Root layout, theme bootstrap
│   ├── components/nova/         # Sidebar, Topbar, Logo, NotificationBell, AuroraBackground, NovaContext
│   ├── integrations/supabase/   # Supabase client
│   └── styles.css               # Theme system (CSS variables + backgrounds)
├── supabase/
│   ├── migrations/               # Consolidated SQL schema (tables, RLS, RPCs, triggers)
│   └── functions/
│       ├── chat/                # RAG pipeline: embed → match_chunks_filtered → Gemini generate
│       ├── ingest-pdf/          # PDF upload → chunk → embed → store
│       ├── invite-user/         # HR-only: single/bulk email invites
│       └── delete-user/         # HR-only: permanently remove a user
└── public/themes/                # HD background images for photo-based themes
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (Postgres with the `vector` extension)
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/nayra.git
cd nayra
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your Supabase project URL and anon/publishable key
(found in **Supabase Dashboard → Project Settings → API**).

### 3. Set up the database

Run the consolidated migration against your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates all tables, RLS policies, triggers, and the
`match_chunks_filtered` RPC, and seeds the default workspaces
(Engineering, Finance, Marketing, HR, All).

Then whitelist your HR Admin email(s):

```sql
INSERT INTO public.hr_whitelist (email) VALUES ('you@company.com');
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy chat
supabase functions deploy ingest-pdf
supabase functions deploy invite-user
supabase functions deploy delete-user
```

Set the required secret:

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:8080`. Sign up with your whitelisted HR email to get
HR Admin access, or sign up normally to join as an Employee.

---

## 🎨 Theming

All 12 background themes live in `src/styles.css`, keyed by
`html[data-theme="..."]` and `.app-bg[data-theme="..."]`. Each theme defines
CSS variables (`--sidebar-bg`, `--topbar-bg`, `--accent`, etc.) so the entire
UI — not just the background — adapts. Users pick a theme in
**Settings → Appearance**; the choice is stored in `localStorage` and applied
on load via an inline script in `__root.tsx` to avoid hydration flicker.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

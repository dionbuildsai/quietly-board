# Quietly Board

Productivity dashboard for Quietly Systems — shared between Dion & Annie with real-time sync.

## Quick Start

### 1. Set up Supabase (free database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project called `quietly-board`
3. Once created, go to **Settings → API**
4. Copy your **Project URL** and **anon/public key**

### 2. Create the database table

In Supabase, go to **SQL Editor** and run this:

```sql
-- Create the board_data table
CREATE TABLE board_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time sync
ALTER PUBLICATION supabase_realtime ADD TABLE board_data;

-- Allow anyone to read/write (for simplicity)
-- In production, you'd want proper auth
ALTER TABLE board_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON board_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 3. Configure environment

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 5. Deploy to Vercel (free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add your environment variables in Vercel's project settings
4. Deploy!

## Features

- **Today**: Daily priorities, today's experiments, blockers, quick tasks
- **Tasks**: Full task management with completion tracking
- **Experiments**: 60 structured experiments across 3 phases
- **Dashboard**: Goals, KPIs, roadmap, monthly scorecard

## Real-time Sync

When connected to Supabase, changes sync instantly between you and Annie. You'll see a sync indicator in the header:

- 🟢 Synced — all good
- 🟡 Syncing — saving changes
- 🔴 Error — sync failed (data saved locally)
- ⚫ Local — no Supabase configured

---

Built with 💜 for Quietly Systems

-- Schéma de la base. À coller une fois dans Supabase > SQL Editor > New query, puis Run.
-- Chaque table est protégée par des règles RLS : un utilisateur ne voit que ses propres lignes.

create extension if not exists pgcrypto;

-- 1. Compte et réglages de l'établissement -------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  business_name text not null default '',
  sector text not null default 'commerce',
  tone text not null default 'chaleureux',
  signature text not null default '',
  private_contact text not null default '',
  extra_instructions text not null default '',
  auto_publish_min_rating smallint check (auto_publish_min_rating in (4, 5)), -- null = validation manuelle
  alert_email boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Abonnement Stripe (écrit uniquement par le serveur, via le webhook) --------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text,
  status text not null default 'none',
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 3. Connexion Google (jeton chiffré, jamais lisible depuis le navigateur) ------------------
create table if not exists public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,
  refresh_token_enc text not null,
  connected_at timestamptz not null default now()
);

-- 4. Établissements ------------------------------------------------------------------------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_account_name text,
  google_location_name text,
  title text not null,
  review_url text,
  slug text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, google_location_name)
);
create index if not exists locations_google_name_idx on public.locations (google_location_name);

-- 5. Avis ----------------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  google_review_name text unique,
  reviewer_name text,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  review_created_at timestamptz not null,
  draft_text text,
  reply_text text,
  reply_published_at timestamptz,
  status text not null default 'new' check (status in ('new', 'drafted', 'published', 'ignored')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_user_idx on public.reviews (user_id, review_created_at desc);

-- 6. Demandes d'avis envoyées (une seule par destinataire et par établissement) -------------
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  channel text not null default 'email',
  recipient text not null,
  sent_at timestamptz not null default now(),
  unique (location_id, recipient)
);

-- 7. Messages privés laissés par les clients sur la page de collecte ------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  contact text,
  created_at timestamptz not null default now()
);

-- Création automatique du compte à l'inscription ---------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sécurité ligne par ligne --------------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.google_connections enable row level security;
alter table public.locations enable row level security;
alter table public.reviews enable row level security;
alter table public.review_requests enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = id);
drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = id) with check (auth.uid() = id);

-- Lecture seule côté utilisateur : seul le serveur (clé service_role) modifie l'abonnement.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);

-- google_connections : aucune règle, donc aucun accès hors serveur. C'est voulu.

drop policy if exists "locations_select_own" on public.locations;
create policy "locations_select_own" on public.locations for select using (auth.uid() = user_id);

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews for select using (auth.uid() = user_id);
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "requests_select_own" on public.review_requests;
create policy "requests_select_own" on public.review_requests for select using (auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback for select using (auth.uid() = user_id);

-- Synthèse IA des avis (page Analyse) ---------------------------------------------------------
alter table public.accounts add column if not exists insights jsonb;
alter table public.accounts add column if not exists insights_at timestamptz;

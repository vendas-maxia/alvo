-- =====================================================================
-- Base de clientes Maxfio / AtivaMax — schema para Supabase (Postgres)
-- Rode este script inteiro em: Supabase > SQL Editor > New query > Run
-- (mesmo projeto usado pelo CRM Sicredi/MaxIA)
-- =====================================================================

create table if not exists public.ativamax_carteira_clientes (
  id text primary key,
  codigo text default '',
  nome text not null default '',
  cnpj text default '',
  cidade text default '',
  uf text default '',
  telefone text default '',
  whatsapp text default '',
  email text default '',
  contato text default '',
  endereco text default '',
  representante text default '',
  ultima_compra date,

  carteiras jsonb default '[]'::jsonb,          -- ["MAXFIO"], ["IMP"], ["VF"] (exibidas como Base1/Base2/Base3 no app)
  canais_ok jsonb default '[]'::jsonb,           -- canais de contato já trabalhados

  ramo text default 'Não identificado',          -- inferido pelo nome, editável manualmente no app
  porte text default 'Não informado',            -- Pequena | Média | Grande | Não informado
  nota text default '',                          -- anotação livre

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ativamax_carteira_updated_at on public.ativamax_carteira_clientes;
create trigger trg_ativamax_carteira_updated_at
  before update on public.ativamax_carteira_clientes
  for each row execute function public.set_updated_at();

create index if not exists idx_ativamax_cidade on public.ativamax_carteira_clientes (cidade);
create index if not exists idx_ativamax_uf on public.ativamax_carteira_clientes (uf);
create index if not exists idx_ativamax_ramo on public.ativamax_carteira_clientes (ramo);
create index if not exists idx_ativamax_porte on public.ativamax_carteira_clientes (porte);
create index if not exists idx_ativamax_nome on public.ativamax_carteira_clientes (nome);

-- Segurança (RLS) — mesmo padrão do CRM: liberado para quem tiver a anon key
-- (app interno sem login). Se precisar restringir, trocar por Supabase Auth depois.
alter table public.ativamax_carteira_clientes enable row level security;

drop policy if exists "acesso total via anon key" on public.ativamax_carteira_clientes;
create policy "acesso total via anon key"
  on public.ativamax_carteira_clientes
  for all
  to anon
  using (true)
  with check (true);

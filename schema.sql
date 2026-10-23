-- Run in your OWN Supabase SQL Editor before enabling checkout.
-- All billable state is written only by the server using the Supabase service-role key.
create table if not exists public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'none' check (plan in ('none','creator','pro','studio')),
  status text not null default 'inactive',
  has_used_trial boolean not null default false,
  trial_end timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  access_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  quota_limit integer not null default 0 check (quota_limit >= 0),
  quota_used integer not null default 0 check (quota_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  status text not null default 'reserved' check (status in ('reserved','completed','failed','expired')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_rankify_exports_user_created on public.export_jobs(user_id,created_at desc);

alter table public.billing_accounts enable row level security;
alter table public.stripe_events enable row level security;
alter table public.export_jobs enable row level security;
-- No public RLS write policies. All reads in website go through authenticated server APIs.

create or replace function public.reserve_rankify_export(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.billing_accounts%rowtype;
  reclaimed integer := 0;
  job_id uuid;
begin
  select * into acct from public.billing_accounts where user_id=p_user_id for update;
  if not found then return null; end if;
  -- Release abandoned reservations only from the current subscription billing period.
  with expired as (
    update public.export_jobs
    set status='expired', finished_at=now()
    where user_id=p_user_id and status='reserved'
      and created_at < now() - interval '2 hours'
      and period_start=acct.period_start
    returning id
  ) select count(*) into reclaimed from expired;
  if reclaimed>0 then
    update public.billing_accounts set quota_used=greatest(0,quota_used-reclaimed) where user_id=p_user_id;
    acct.quota_used:=greatest(0,acct.quota_used-reclaimed);
  end if;
  if acct.status not in ('trialing','active')
     or acct.period_end is null or acct.period_end <= now()
     or acct.quota_used>=acct.quota_limit then return null; end if;
  update public.billing_accounts set quota_used=quota_used+1 where user_id=p_user_id;
  insert into public.export_jobs(user_id,period_start,status)
  values(p_user_id,acct.period_start,'reserved') returning id into job_id;
  return job_id;
end;
$$;

create or replace function public.finalise_rankify_export(p_user_id uuid,p_export_id uuid,p_outcome text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  acct public.billing_accounts%rowtype;
  job_period timestamptz;
begin
  if p_outcome not in ('completed','failed') then return false; end if;
  select * into acct from public.billing_accounts where user_id=p_user_id for update;
  if not found then return false; end if;
  update public.export_jobs set status=p_outcome,finished_at=now()
  where id=p_export_id and user_id=p_user_id and status='reserved'
  returning period_start into job_period;
  if not found then return false; end if;
  if p_outcome='failed' and job_period=acct.period_start then
    update public.billing_accounts set quota_used=greatest(0,quota_used-1)
    where user_id=p_user_id;
  end if;
  return true;
end;
$$;

revoke all on public.billing_accounts from anon,authenticated;
revoke all on public.stripe_events from anon,authenticated;
revoke all on public.export_jobs from anon,authenticated;
revoke all on function public.reserve_rankify_export(uuid) from public,anon,authenticated;
revoke all on function public.finalise_rankify_export(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_rankify_export(uuid) to service_role;
grant execute on function public.finalise_rankify_export(uuid,uuid,text) to service_role;
-- Ensure the server-only service role can operate on created tables.
grant select, insert, update, delete on public.billing_accounts to service_role;
grant select, insert, update, delete on public.export_jobs to service_role;
grant select, insert, update, delete on public.stripe_events to service_role;

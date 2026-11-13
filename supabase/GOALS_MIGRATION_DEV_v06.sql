-- EPSA Gestão Comercial — metas mensais por vendedor (v0.6)
-- SOMENTE projeto Supabase "Gestao Comercial Temporario" (tilrqwcymhghmpvxukur).
-- Migração incremental: não recria nem altera tabelas v0.5 existentes.
-- Não executar duas vezes. Revisão: 13/11/2026.

create table public.gc_monthly_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.gc_companies(id),
  seller_id uuid not null,
  month_start date not null,
  goal_atendimentos integer not null default 0 check (goal_atendimentos between 0 and 10000000),
  goal_vendas integer not null default 0 check (goal_vendas between 0 and 10000000),
  goal_cotas integer not null default 0 check (goal_cotas between 0 and 10000000),
  goal_creditos numeric(16,2) not null default 0 check (goal_creditos between 0 and 10000000000000),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gc_monthly_goals_month_first_day check (month_start = date_trunc('month',month_start)::date),
  constraint gc_monthly_goals_seller_fk foreign key(company_id,seller_id) references public.gc_memberships(company_id,user_id),
  constraint gc_monthly_goals_unique unique(company_id,seller_id,month_start)
);

create index gc_monthly_goals_company_month_idx on public.gc_monthly_goals(company_id,month_start);
create index gc_monthly_goals_seller_month_idx on public.gc_monthly_goals(seller_id,month_start);
alter table public.gc_monthly_goals enable row level security;
revoke all on public.gc_monthly_goals from public,anon,authenticated;
grant select,insert on public.gc_monthly_goals to authenticated;
grant update(goal_atendimentos,goal_vendas,goal_cotas,goal_creditos) on public.gc_monthly_goals to authenticated;

-- A leitura depende de autorização no banco; não depende de dados editáveis no JWT.
create policy gc_monthly_goals_read on public.gc_monthly_goals for select to authenticated
using (gc_private.is_member(company_id) and
      (seller_id=(select auth.uid()) or gc_private.can_review_seller(company_id,seller_id)));

create policy gc_monthly_goals_insert on public.gc_monthly_goals for insert to authenticated
with check (gc_private.can_review_seller(company_id,seller_id)
            and gc_private.is_active_seller(company_id,seller_id)
            and created_by=(select auth.uid()) and updated_by=(select auth.uid()));

create policy gc_monthly_goals_update on public.gc_monthly_goals for update to authenticated
using (gc_private.can_review_seller(company_id,seller_id)
       and gc_private.is_active_seller(company_id,seller_id))
with check (gc_private.can_review_seller(company_id,seller_id)
            and gc_private.is_active_seller(company_id,seller_id)
            and updated_by=(select auth.uid()));

-- Canais externos não podem falsificar quem definiu ou modificou a meta.
create function gc_private.guard_goal_insert() returns trigger language plpgsql
set search_path = '' as $$
begin
  if (select auth.uid()) is null or
     not gc_private.can_review_seller(new.company_id,new.seller_id) or
     not gc_private.is_active_seller(new.company_id,new.seller_id) then
       raise exception 'Inclusão de meta não autorizada';
  end if;
  new.created_by=(select auth.uid()); new.updated_by=(select auth.uid());
  new.created_at=now(); new.updated_at=now();
  return new;
end; $$;

create function gc_private.guard_goal_update() returns trigger language plpgsql
set search_path = '' as $$
begin
  if not gc_private.can_review_seller(old.company_id,old.seller_id) or
     not gc_private.is_active_seller(old.company_id,old.seller_id) or
     (to_jsonb(new)-'goal_atendimentos'-'goal_vendas'-'goal_cotas'-'goal_creditos'-'updated_at'-'updated_by') <>
     (to_jsonb(old)-'goal_atendimentos'-'goal_vendas'-'goal_cotas'-'goal_creditos'-'updated_at'-'updated_by') then
       raise exception 'Apenas valores de metas podem ser alterados pelo supervisor autorizado';
  end if;
  new.updated_by=(select auth.uid()); new.updated_at=now();
  return new;
end; $$;

create trigger gc_goal_insert_guard before insert on public.gc_monthly_goals
for each row execute function gc_private.guard_goal_insert();
create trigger gc_goal_update_guard before update on public.gc_monthly_goals
for each row execute function gc_private.guard_goal_update();

-- Auditoria é escrita por trigger, não fica acessível a usuários comuns.
create table public.gc_goal_audit (
  id bigint generated always as identity primary key,
  goal_id uuid not null,
  company_id uuid not null,
  event text not null,
  changed_by uuid,
  old_row jsonb,
  new_row jsonb,
  changed_at timestamptz not null default now()
);
alter table public.gc_goal_audit enable row level security;
revoke all on public.gc_goal_audit from public,anon,authenticated;

create function gc_private.audit_goal_change() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
 insert into public.gc_goal_audit(goal_id,company_id,event,changed_by,old_row,new_row)
 values(new.id,new.company_id,lower(tg_op),(select auth.uid()),
        case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end; $$;

create trigger gc_goal_audit_insert_update after insert or update on public.gc_monthly_goals
for each row execute function gc_private.audit_goal_change();

-- Permissões de funções privadas devem ser mínimas: usuários só precisam das
-- funções invocadas nas policies, nunca de acesso à API da tabela de auditoria.
revoke execute on function gc_private.guard_goal_insert() from public,anon,authenticated;
revoke execute on function gc_private.guard_goal_update() from public,anon,authenticated;
revoke execute on function gc_private.audit_goal_change() from public,anon,authenticated;

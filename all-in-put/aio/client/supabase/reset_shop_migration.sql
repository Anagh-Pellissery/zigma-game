-- This migration updates the game_admin function to include the 'reset-shop' action.
-- Run this in your Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.game_admin(p_action text, p_body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  b jsonb := coalesce(p_body, '{}');
  a auction_state; t teams; x jsonb; n numeric; sold boolean; v_u text; v_p text;
begin
  if p_action = 'state' then return admin_state(); end if;
  perform pg_advisory_xact_lock(4242);
  select * into a from auction_state where id = 1;

  if p_action = 'timer' then
    if b->>'action' = 'start' then
      update settings set started_at = server_now(), base_ms = (coalesce((b->>'baseMin')::numeric, 5) * 60000) where id = 1;
    elsif b->>'action' = 'reset' then
      update settings set started_at = null, base_ms = (coalesce((b->>'baseMin')::numeric, 5) * 60000) where id = 1;
    else
      update settings set base_ms = (coalesce((b->>'baseMin')::numeric, 5) * 60000) where id = 1;
    end if;

  elsif p_action = 'settings' then
    update settings set default_credits = coalesce((b->>'defaultCredits')::numeric, default_credits),
                        multiplier = coalesce((b->>'mult')::numeric, multiplier) where id = 1;

  elsif p_action = 'components' then
    if jsonb_typeof(b->'list') = 'array' then
      for x in select * from jsonb_array_elements(b->'list') loop
        update shop_components set name = x->>'name', qty = _num(x->'qty'), price = _num(x->'price') where id = x->>'id';
      end loop;
    end if;

  elsif p_action = 'auction' then
    if jsonb_typeof(b->'list') = 'array' then
      for x in select * from jsonb_array_elements(b->'list') loop
        update auction_items set name = x->>'name', qty = _num(x->'qty'), base = _num(x->'base'), inc = _num(x->'inc') where id = x->>'id';
      end loop;
    end if;
    if a.status = 'idle' then update auction_items set next_price = base where true; end if;

  elsif p_action = 'auction-generate' then
    if a.status <> 'idle' then raise exception 'Reset the auction before generating a new list'; end if;
    update auction_items set next_price = base where true;
    update auction_state set queue = coalesce((
      select array_agg(i.id order by random()) from auction_items i, generate_series(1, i.qty)), '{}') where id = 1;
    if (select cardinality(queue) from auction_state where id = 1) = 0 then
      raise exception 'No component has a quantity above 0';
    end if;

  elsif p_action = 'auction-queue' then
    if jsonb_typeof(b->'queue') <> 'array' or exists (
      select 1 from jsonb_array_elements_text(b->'queue') q where q not in (select id from auction_items)) then
      raise exception 'Invalid list';
    end if;
    update auction_state set queue = array(select jsonb_array_elements_text(b->'queue')) where id = 1;

  elsif p_action = 'auction-start' then
    if a.status <> 'idle' then raise exception 'Auction already started'; end if;
    if cardinality(a.queue) = 0 then raise exception 'Generate a list first'; end if;
    perform _auc_next();

  elsif p_action = 'auction-pause' then
    if a.status <> 'live' or a.lot_item_id is null then raise exception 'Nothing to pause'; end if;
    update auction_state set status = 'paused',
      paused_at = server_now(),
      lot_ends_at = null
      where id = 1;

  elsif p_action = 'auction-resume' then
    if a.status <> 'paused' or a.lot_item_id is null or a.paused_at is null then raise exception 'Not paused'; end if;
    update auction_state set status = 'live',
      lot_ends_at = server_now() + ((15000) - (paused_at - lot_started_at)),
      paused_at = null
      where id = 1;

  elsif p_action = 'auction-next' then
    if a.status = 'idle' then raise exception 'Auction is idle'; end if;
    sold := _auc_settle();
    perform _auc_next();
    if sold then
      perform pg_notify('auction_fireworks', '');
    end if;

  elsif p_action = 'auction-prev' then
    if a.status = 'idle' then raise exception 'Auction is idle'; end if;
    perform _refund_leader();
    if cardinality(a.history) > 0 then
      a.queue := array_prepend(a.lot_item_id, a.queue);
      a.lot_item_id := a.history[cardinality(a.history)];
      a.history := a.history[:cardinality(a.history)-1];
      update auction_state set queue = a.queue, history = a.history, lot_item_id = a.lot_item_id, lot_bid = 0, lot_leader_id = null, lot_leader_name = null, lot_bids = '[]', status = 'paused', paused_at = server_now(), lot_started_at = server_now(), lot_ends_at = null where id = 1;
    end if;

  elsif p_action = 'auction-sell' then
    if a.status <> 'paused' then raise exception 'Auction must be paused to manually assign'; end if;
    select * into t from teams where username = b->>'u';
    if not found then raise exception 'Team not found'; end if;
    n := _num(b->'bid');
    if n is null or n <= 0 then raise exception 'Invalid bid'; end if;
    if t.credits < n then raise exception 'Team cannot afford %', n; end if;
    perform _refund_leader();
    update teams set credits = credits - n where id = t.id;
    update auction_state set lot_leader_id = t.id, lot_leader_name = t.username, lot_bid = n,
      lot_bids = coalesce(lot_bids, '[]'::jsonb) || jsonb_build_object('team', t.username, 'bid', n, 't', server_now())
      where id = 1;
    perform _auc_settle();
    perform _auc_next();
    perform pg_notify('auction_fireworks', '');

  elsif p_action = 'auction-reset' then
    perform _refund_leader();
    perform _reset_auction();

  elsif p_action = 'team-add' then
    v_u := trim(coalesce(b->>'u', ''));
    v_p := coalesce(b->>'p', '');
    if v_u = '' or v_p = '' then raise exception 'Name and password required'; end if;
    if length(v_u) > 40 then raise exception 'Team name is too long'; end if;
    if exists (select 1 from teams where username = v_u) then raise exception 'Team exists'; end if;
    n := _num(b->'credits');
    insert into teams (username, password_hash, credits)
      values (v_u, extensions.crypt(v_p, extensions.gen_salt('bf')),
              coalesce(floor(n), (select default_credits from settings where id = 1)));

  elsif p_action = 'team-edit' then
    select * into t from teams where username = b->>'u';
    if found then
      if coalesce(b->>'p', '') <> '' then
        update teams set password_hash = extensions.crypt(b->>'p', extensions.gen_salt('bf')), token_ver = token_ver + 1 where id = t.id;
      end if;
      n := _num(b->'credits');
      if n is not null then update teams set credits = floor(n) where id = t.id; end if;
    end if;

  elsif p_action = 'team-del' then
    select * into t from teams where username = b->>'u';
    if found then
      if a.lot_leader_id = t.id then
        update auction_state set lot_bid = 0, lot_leader_id = null, lot_leader_name = null where id = 1;
      end if;
      update auction_state set lot_bids = coalesce((select jsonb_agg(e.value) from jsonb_array_elements(lot_bids) e
        where e.value->>'team' <> t.username), '[]') where id = 1;
      delete from teams where id = t.id;
    end if;

  elsif p_action = 'reset-orders' then
    delete from orders where true;

  elsif p_action = 'reset-shop' then
    update teams t set credits = t.credits + coalesce((select sum(total) from orders where team_id = t.id and phase != 'auction'), 0);
    delete from orders where phase != 'auction';
    delete from inventory where item_id in (select id from shop_components);
    delete from trading_listings where item_id in (select id from shop_components);
    delete from trading_history where item_id in (select id from shop_components);
    update shop_components set qty = default_qty where true;

  elsif p_action = 'reset-all' then
    delete from orders where true;
    delete from trading_listings where true;
    delete from trading_history where true;
    delete from inventory where true;
    perform _reset_auction();
    update settings set started_at = null where id = 1;
    update teams set credits = (select default_credits from settings where id = 1) where true;
    update shop_components set qty = default_qty where true;

  else
    raise exception 'Not found';
  end if;

  perform refresh_public_state();
  return admin_state();
end;
$function$
;

-- Website forms are written only by the server endpoint. Remove any inherited
-- table access and grant the server role the single operation it needs.
alter table public.waitlist_signups enable row level security;
alter table public.contact_messages enable row level security;

revoke all on table public.waitlist_signups from public, anon, authenticated, service_role;
revoke all on table public.contact_messages from public, anon, authenticated, service_role;

grant insert on table public.waitlist_signups to service_role;
grant insert on table public.contact_messages to service_role;

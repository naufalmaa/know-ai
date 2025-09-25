-- RBAC Enhancement: User Management and Permissions
-- This script enhances the existing users table and adds RBAC functionality

-- Add additional columns to users table for RBAC
alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists is_active boolean default true;
alter table users add column if not exists last_login timestamptz;
alter table users add column if not exists created_by uuid references users(id);
alter table users add column if not exists updated_at timestamptz default now();

-- Update role column to use ENUM-like constraint
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check 
  check (role in ('superadmin', 'admin', 'user'));

-- Create permissions table
create table if not exists permissions(
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  resource text not null, -- e.g., 'users', 'files', 'folders'
  action text not null,   -- e.g., 'create', 'read', 'update', 'delete'
  created_at timestamptz default now()
);

-- Create role_permissions junction table
create table if not exists role_permissions(
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission_id uuid references permissions(id) on delete cascade,
  granted boolean default true,
  created_at timestamptz default now(),
  unique(role, permission_id)
);

-- Create audit log table for tracking user actions
create table if not exists audit_logs(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Insert default permissions
insert into permissions (name, description, resource, action) values
  -- User management permissions
  ('users.create', 'Create new users', 'users', 'create'),
  ('users.read', 'View user information', 'users', 'read'),
  ('users.update', 'Update user information', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('users.list', 'List all users', 'users', 'list'),
  
  -- File management permissions
  ('files.create', 'Upload files', 'files', 'create'),
  ('files.read', 'View and download files', 'files', 'read'),
  ('files.update', 'Update file information', 'files', 'update'),
  ('files.delete', 'Delete files', 'files', 'delete'),
  ('files.list', 'List files', 'files', 'list'),
  
  -- Folder management permissions
  ('folders.create', 'Create folders', 'folders', 'create'),
  ('folders.read', 'View folder contents', 'folders', 'read'),
  ('folders.update', 'Rename folders', 'folders', 'update'),
  ('folders.delete', 'Delete folders', 'folders', 'delete'),
  ('folders.list', 'List folders', 'folders', 'list'),
  
  -- System permissions
  ('system.admin', 'System administration access', 'system', 'admin'),
  ('audit.read', 'View audit logs', 'audit', 'read')
on conflict (name) do nothing;

-- Assign permissions to roles
-- Superadmin: All permissions
insert into role_permissions (role, permission_id) 
select 'superadmin', id from permissions
on conflict (role, permission_id) do nothing;

-- Admin: All permissions except system admin (can't manage other admins' full privileges)
insert into role_permissions (role, permission_id) 
select 'admin', id from permissions 
where name != 'system.admin'
on conflict (role, permission_id) do nothing;

-- User: Basic file and folder operations only
insert into role_permissions (role, permission_id) 
select 'user', id from permissions 
where name in (
  'files.create', 'files.read', 'files.update', 'files.delete', 'files.list',
  'folders.create', 'folders.read', 'folders.update', 'folders.delete', 'folders.list'
)
on conflict (role, permission_id) do nothing;

-- Create the superadmin user if it doesn't exist
-- Password: SuperAdmin123! (should be changed after first login)
insert into users (id, email, password_hash, role, first_name, last_name, is_active, created_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'superadmin@knowai.com',
  crypt('SuperAdmin123!', gen_salt('bf')),
  'superadmin',
  'Super',
  'Admin',
  true,
  now()
) on conflict (email) do nothing;

-- Create indexes for better performance
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_is_active on users(is_active);
create index if not exists idx_audit_logs_user_id on audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at);
create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_token on sessions(token);
create index if not exists idx_sessions_expires_at on sessions(expires_at);

-- Function to check if user has permission
create or replace function user_has_permission(user_role text, permission_name text)
returns boolean as $$
begin
  return exists (
    select 1 
    from role_permissions rp
    join permissions p on rp.permission_id = p.id
    where rp.role = user_role 
      and p.name = permission_name 
      and rp.granted = true
  );
end;
$$ language plpgsql;

-- Function to log user actions
create or replace function log_user_action(
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_ip_address inet default null,
  p_user_agent text default null
) returns uuid as $$
declare
  log_id uuid;
begin
  insert into audit_logs (
    user_id, action, resource_type, resource_id, 
    old_values, new_values, ip_address, user_agent
  ) values (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent
  ) returning id into log_id;
  
  return log_id;
end;
$$ language plpgsql;

-- Update trigger for users table to track updates
create or replace function users_audit_trigger() returns trigger as $$
begin
  if TG_OP = 'UPDATE' then
    perform log_user_action(
      NEW.id,
      'update',
      'users',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  elsif TG_OP = 'DELETE' then
    perform log_user_action(
      OLD.id,
      'delete',
      'users',
      OLD.id,
      to_jsonb(OLD),
      null
    );
  end if;
  
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$ language plpgsql;

-- Create triggers
drop trigger if exists users_audit_trigger on users;
create trigger users_audit_trigger
  after update or delete on users
  for each row execute function users_audit_trigger();

-- Update timestamp trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at
  before update on users
  for each row execute function update_updated_at_column();
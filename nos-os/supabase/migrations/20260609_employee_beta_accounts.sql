create extension if not exists "pgcrypto";

alter table public.users add column if not exists password_salt text;
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists must_change_password boolean not null default true;
alter table public.users add column if not exists password_changed_at timestamptz;

with beta_users(id, email, role, employment_type, auth_provider) as (
  values
    ('7b15b29d-84e2-5c94-8adc-ac8d6345d10c'::uuid, 'urata@nostechnology.jp', 'admin', 'full_time', 'email'),
    ('0b7ff346-13f0-506e-a5ca-45d2fb80f53c'::uuid, 'osaki@nostechnology.jp', 'admin', 'full_time', 'email'),
    ('bd5299e1-ef26-5155-b34a-7612f1b2060d'::uuid, 'hashisako@nostechnology.jp', 'employee', 'full_time', 'email'),
    ('f9a1f3e5-8849-5f40-9a13-a4521661e2dc'::uuid, 'watanabe@nostechnology.jp', 'employee', 'full_time', 'email')
)
insert into public.users (id, email, role, employment_type, auth_provider)
select id, email, role, employment_type, auth_provider
from beta_users
on conflict (id) do update
set
  email = excluded.email,
  role = excluded.role,
  employment_type = excluded.employment_type,
  auth_provider = excluded.auth_provider,
  updated_at = now();

update public.users
set password_salt = encode(gen_random_bytes(16), 'hex')
where id in (
  '7b15b29d-84e2-5c94-8adc-ac8d6345d10c',
  '0b7ff346-13f0-506e-a5ca-45d2fb80f53c',
  'bd5299e1-ef26-5155-b34a-7612f1b2060d',
  'f9a1f3e5-8849-5f40-9a13-a4521661e2dc'
) and (password_salt is null or password_salt = '');

update public.users
set
  password_hash = encode(digest(password_salt || ':0000', 'sha256'), 'hex'),
  must_change_password = true,
  password_changed_at = null,
  updated_at = now()
where id in (
  '7b15b29d-84e2-5c94-8adc-ac8d6345d10c',
  '0b7ff346-13f0-506e-a5ca-45d2fb80f53c',
  'bd5299e1-ef26-5155-b34a-7612f1b2060d',
  'f9a1f3e5-8849-5f40-9a13-a4521661e2dc'
) and password_hash is null;

with beta_employees(
  id,
  user_id,
  name,
  position,
  department,
  avatar_url,
  bio,
  leave_balance_days,
  attendance_status
) as (
  values
    ('0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, '7b15b29d-84e2-5c94-8adc-ac8d6345d10c'::uuid, '浦田 和真', '管理者 / 代表', '経営・営業', 'UK', '会社全体の案件、売上、タスク優先度を確認します。', 11, 'working'),
    ('e47d3925-107f-5836-b288-bc701828be71'::uuid, '0b7ff346-13f0-506e-a5ca-45d2fb80f53c'::uuid, '大崎 雄介', '管理者 / 運用', '経営・運用', 'OY', '社員βの運用、案件確認、タスク整理を担当します。', 12, 'working'),
    ('592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid, 'bd5299e1-ef26-5155-b34a-7612f1b2060d'::uuid, '橋迫 翔太', '社員', '制作・運用', 'HS', '制作、確認、営業準備のタスクを担当します。', 10, 'meeting'),
    ('4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid, 'f9a1f3e5-8849-5f40-9a13-a4521661e2dc'::uuid, '渡邉 駿', '社員', 'システム開発', 'WS', 'システム、DB、業務改善タスクを担当します。', 10, 'working')
)
insert into public.employees (
  id,
  user_id,
  name,
  position,
  department,
  avatar_url,
  bio,
  leave_balance_days,
  attendance_status
)
select
  id,
  user_id,
  name,
  position,
  department,
  avatar_url,
  bio,
  leave_balance_days,
  attendance_status
from beta_employees
on conflict (id) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  position = excluded.position,
  department = excluded.department,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  leave_balance_days = excluded.leave_balance_days,
  attendance_status = excluded.attendance_status,
  updated_at = now();

with employee_map(old_id, new_id) as (
  values
    ('80af2865-6074-5408-b819-e2d52e78ba2a'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('21f4bb6a-7b5a-532d-a978-65d230c0c9b8'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('bbff6168-2bb0-52b0-b096-d17ba5152ff7'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('e437495f-981d-5f3d-9c42-0e4e032fddc6'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid)
)
update public.projects
set primary_owner_id = employee_map.new_id, updated_at = now()
from employee_map
where public.projects.primary_owner_id = employee_map.old_id;

with employee_map(old_id, new_id) as (
  values
    ('80af2865-6074-5408-b819-e2d52e78ba2a'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('21f4bb6a-7b5a-532d-a978-65d230c0c9b8'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('bbff6168-2bb0-52b0-b096-d17ba5152ff7'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('e437495f-981d-5f3d-9c42-0e4e032fddc6'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid)
)
update public.projects
set secondary_owner_id = employee_map.new_id, updated_at = now()
from employee_map
where public.projects.secondary_owner_id = employee_map.old_id;

with employee_map(old_id, new_id) as (
  values
    ('80af2865-6074-5408-b819-e2d52e78ba2a'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('21f4bb6a-7b5a-532d-a978-65d230c0c9b8'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('bbff6168-2bb0-52b0-b096-d17ba5152ff7'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('e437495f-981d-5f3d-9c42-0e4e032fddc6'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid)
)
update public.tasks
set primary_assignee_id = employee_map.new_id, updated_at = now()
from employee_map
where public.tasks.primary_assignee_id = employee_map.old_id;

with employee_map(old_id, new_id) as (
  values
    ('80af2865-6074-5408-b819-e2d52e78ba2a'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('21f4bb6a-7b5a-532d-a978-65d230c0c9b8'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('bbff6168-2bb0-52b0-b096-d17ba5152ff7'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('e437495f-981d-5f3d-9c42-0e4e032fddc6'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid)
)
update public.goal_trees
set owner_employee_id = employee_map.new_id, updated_at = now()
from employee_map
where public.goal_trees.owner_employee_id = employee_map.old_id;

with project_member_seed(project_id, employee_id, role) as (
  values
    ('65642bd9-140c-55a6-891a-0bfd0d4879a3'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, 'primary'),
    ('65642bd9-140c-55a6-891a-0bfd0d4879a3'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid, 'secondary'),
    ('65642bd9-140c-55a6-891a-0bfd0d4879a3'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid, 'secondary'),
    ('a0677715-9120-5849-98c7-76fe36322078'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid, 'primary'),
    ('a0677715-9120-5849-98c7-76fe36322078'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, 'secondary'),
    ('a0677715-9120-5849-98c7-76fe36322078'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid, 'secondary'),
    ('240b0959-9d57-5600-9172-8d10182bfb87'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid, 'primary'),
    ('240b0959-9d57-5600-9172-8d10182bfb87'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid, 'secondary'),
    ('240b0959-9d57-5600-9172-8d10182bfb87'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, 'secondary'),
    ('696aaba0-a249-5558-a843-1ac436a2dc53'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid, 'primary'),
    ('696aaba0-a249-5558-a843-1ac436a2dc53'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, 'secondary'),
    ('696aaba0-a249-5558-a843-1ac436a2dc53'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid, 'secondary'),
    ('b89ae7f4-3c37-5ca3-95af-7ca2d2739c94'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid, 'primary'),
    ('b89ae7f4-3c37-5ca3-95af-7ca2d2739c94'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid, 'secondary'),
    ('b89ae7f4-3c37-5ca3-95af-7ca2d2739c94'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, 'secondary')
)
insert into public.project_members (project_id, employee_id, role)
select project_id, employee_id, role
from project_member_seed
on conflict (project_id, employee_id) do update set role = excluded.role;

delete from public.project_members
where employee_id in (
  '80af2865-6074-5408-b819-e2d52e78ba2a',
  '21f4bb6a-7b5a-532d-a978-65d230c0c9b8',
  'bbff6168-2bb0-52b0-b096-d17ba5152ff7',
  'e437495f-981d-5f3d-9c42-0e4e032fddc6'
);

with task_assignee_seed(task_id, employee_id) as (
  values
    ('f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid),
    ('f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('3fbf6ddc-c89e-52d9-873b-d19efcb70123'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid),
    ('3fbf6ddc-c89e-52d9-873b-d19efcb70123'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('6f3edf32-5067-59bb-8fd3-6d165fa180f8'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('6f3edf32-5067-59bb-8fd3-6d165fa180f8'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid),
    ('808ea268-10d3-58c2-8ff2-b3c6558daf8a'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('808ea268-10d3-58c2-8ff2-b3c6558daf8a'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('37d8297a-3a86-582f-b364-1943049f2d00'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('37d8297a-3a86-582f-b364-1943049f2d00'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('2182d3ab-4a93-5198-8b9e-dfe1be5ff2d1'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('2182d3ab-4a93-5198-8b9e-dfe1be5ff2d1'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('8c39a87c-fe22-58c7-9a27-184860fcef62'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('8c39a87c-fe22-58c7-9a27-184860fcef62'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid),
    ('8c39a87c-fe22-58c7-9a27-184860fcef62'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid),
    ('60336217-e420-5e4c-8097-90e699904374'::uuid, 'e47d3925-107f-5836-b288-bc701828be71'::uuid),
    ('60336217-e420-5e4c-8097-90e699904374'::uuid, '0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid),
    ('60336217-e420-5e4c-8097-90e699904374'::uuid, '592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid),
    ('60336217-e420-5e4c-8097-90e699904374'::uuid, '4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid)
)
insert into public.task_assignees (task_id, employee_id)
select task_id, employee_id
from task_assignee_seed
on conflict (task_id, employee_id) do nothing;

delete from public.task_assignees
where employee_id in (
  '80af2865-6074-5408-b819-e2d52e78ba2a',
  '21f4bb6a-7b5a-532d-a978-65d230c0c9b8',
  'bbff6168-2bb0-52b0-b096-d17ba5152ff7',
  'e437495f-981d-5f3d-9c42-0e4e032fddc6'
);

delete from public.users
where email in (
  'admin@nostechnology.jp',
  'akari@nostechnology.jp',
  'ren@nostechnology.jp',
  'mio@nostechnology.jp'
);

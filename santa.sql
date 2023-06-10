create table public.santa_users
(
    id         text primary key not null,
    first_name text    default ''::text,
    last_name  text    default ''::text,
    group_name text    default ''::text,
    problems   text    default ''::text,
    pair       text    default ''::text,
    ingame     boolean default false
);


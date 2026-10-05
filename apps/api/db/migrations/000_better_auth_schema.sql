create table "user" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "display_name" text not null, "email" text not null unique, "email_verified" boolean not null, "avatar_url" text, "created_at" timestamptz default CURRENT_TIMESTAMP not null, "updated_at" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "expires_at" timestamptz not null, "token" text not null unique, "created_at" timestamptz default CURRENT_TIMESTAMP not null, "updated_at" timestamptz not null, "ip_address" text, "user_agent" text, "user_id" uuid not null references "user" ("id") on delete cascade);

create table "oauth_account" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "provider_account_id" text not null, "provider" text not null, "user_id" uuid not null references "user" ("id") on delete cascade, "access_token" text, "refresh_token" text, "id_token" text, "access_token_expires_at" timestamptz, "refresh_token_expires_at" timestamptz, "scope" text, "password" text, "created_at" timestamptz default CURRENT_TIMESTAMP not null, "updated_at" timestamptz not null);

create table "verification" ("id" uuid default pg_catalog.gen_random_uuid() not null primary key, "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, "created_at" timestamptz default CURRENT_TIMESTAMP not null, "updated_at" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_user_id_idx" on "session" ("user_id");

create index "oauth_account_user_id_idx" on "oauth_account" ("user_id");

create index "verification_identifier_idx" on "verification" ("identifier");
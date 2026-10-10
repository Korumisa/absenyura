-- ==========================================================================
-- PRISMA SELF-HOST PRE-REQUISITES (PostgreSQL 16)
-- Jalankan sebagai user `postgres` SUPERUSER sebelum `prisma migrate deploy` pertama kali.
--   psql -U postgres -f deploy/prisma-selfhost-prereq.sql
--
-- Urutan:
--   1. Enable required extensions (pgcrypto, uuid-ossp, citext, pg_trgm)
--   2. Create ROLE hmsdp_app (pemilik schema aplikasi, BUKAN superuser)
--   3. Create DATABASE hmsdp dengan ENCODING UTF-8 LC_COLLATE en_US.UTF-8
--   4. Set OWNER hmsdp_app + GRANT ALL PRIVILEGES schema public
--   5. Set default privileges agar hmsdp_app bisa CRUD table baru nantinya
-- ==========================================================================

-- 1. Extensions (idempoten — aman di-run berkali-kali)
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid(), crypt() -> password bcrypt compatible
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4() (compat)
CREATE EXTENSION IF NOT EXISTS citext;        -- case-insensitive email search (opsional tapi safe)
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram index untuk dashboard LIKE/ILIKE wildcards

-- Verifikasi extensions loaded
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto','uuid-ossp','citext','pg_trgm');

-- 2. Buat application role hmsdp_app — JANGAN pakai superuser `postgres` di DATABASE_URL
--    Password SAMA dengan yang diisi di .env DATABASE_URL
--    (Ganti <CHANGE_ME_PASSWORD_32BYTE_HEX> dengan output `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hmsdp_app') THEN
    CREATE ROLE hmsdp_app LOGIN PASSWORD '<CHANGE_ME_PASSWORD_32BYTE_HEX>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  ELSE
    -- Pastikan SCRAM-SHA-256 password (sesuai postgresql.conf password_encryption=scram-sha-256)
    ALTER ROLE hmsdp_app WITH PASSWORD '<CHANGE_ME_PASSWORD_32BYTE_HEX>';
    ALTER ROLE hmsdp_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

-- 3. Create DATABASE hmsdp — abort manual lewat IF NOT EXISTS workaround
SELECT 'CREATE DATABASE hmsdp OWNER hmsdp_app ENCODING = ''UTF8'' LC_COLLATE = ''en_US.UTF-8'' LC_CTYPE = ''en_US.UTF-8'' TEMPLATE = template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hmsdp')\gexec

-- 4. Connect ke hmsdp lalu set privileges
\connect hmsdp

ALTER SCHEMA public OWNER TO hmsdp_app;
GRANT ALL ON SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO hmsdp_app;
GRANT ALL ON ALL PROCEDURES IN SCHEMA public TO hmsdp_app;

-- 5. Default privileges — supaya table/sequence/function baru Prisma migrate deploy
--    otomatis punya privileges untuk hmsdp_app
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO hmsdp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO hmsdp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO hmsdp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TYPES TO hmsdp_app;

-- 6. Verifikasi final
\echo 'Extensions required:'
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','uuid-ossp','citext','pg_trgm');
\echo 'Database owner & encoding:'
SELECT datname, pg_catalog.pg_get_userbyid(datdba) AS owner, pg_encoding_to_char(encoding) AS encoding, datcollate, datctype FROM pg_database WHERE datname = 'hmsdp';
\echo 'Role hmsdp_app attributes:'
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin FROM pg_roles WHERE rolname = 'hmsdp_app';
\echo '✓ PREREQUISITES BERHASIL. Selanjutnya: npx prisma@6.4.1 migrate deploy'

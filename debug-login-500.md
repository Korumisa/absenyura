# [OPEN] Debug Session: login-500

## Symptom

- Production `POST /api/auth/login` returns `500`
- Expected behavior: valid credentials should return `200` and create/update session state

## Hypotheses

1. Production database schema is behind the Prisma client, so login writes to a column that does not exist yet.
2. Production app is pointed to the wrong database instance or an older database with incomplete migrations.
3. A recent auth code path introduced a write to `refresh_token_hash`, but the corresponding migration was never applied in production.
4. The Prisma client bundled in production is newer than the database schema deployed there, causing runtime query failure during login.

## Evidence Log

- Vercel production log shows `PrismaClientKnownRequestError` during `POST /api/auth/login`.
- Error text: `The column 'refresh_token_hash' does not exist in the current database.`
- Stack trace points to [authService.ts](file:///c:/Users/shink/Pictures/absenyura/server/services/authService.ts#L158-L164) where login updates `refresh_token_hash`.
- Prisma schema defines `refresh_token_hash` on `User` in [schema.prisma](file:///c:/Users/shink/Pictures/absenyura/prisma/schema.prisma#L24-L26).
- Matching migration exists in [migration.sql](file:///c:/Users/shink/Pictures/absenyura/prisma/migrations/20260604210000_user_refresh_token_hash/migration.sql#L1-L2), so production DB is likely missing that migration or targeting an older database.

## Instrumentation Plan

- Start from existing Vercel runtime evidence and map the failing Prisma write path in the login flow.
- Only add instrumentation if the current evidence is insufficient to distinguish schema drift vs wrong database target.

## Status

- Root cause strongly indicates production schema drift; waiting for user approval before applying the production-safe fix.

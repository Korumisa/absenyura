# [OPEN] Debug Session: api-status-500

## Symptom

- Production `GET /api/status` returns `500` on `https://hmsdp.vercel.app/api/status`
- Expected behavior: route should return `200` when DB ping succeeds or `503` when degraded

## Hypotheses

1. Vercel serverless packaging is missing a required runtime file or module before route execution.
2. Prisma/database initialization fails in a way that escapes the local `try/catch` and crashes the function.
3. The Vercel entrypoint or rewrite reaches `/api/index.ts`, but bootstrap/app initialization throws before `/api/status` is handled.
4. A production-only initialization path or middleware in app bootstrap throws before the response is sent.

## Evidence Log

- Pending

## Instrumentation Plan

- Add minimal runtime instrumentation to Vercel entry/bootstrap and `/api/status` path only.
- Reproduce on production and compare pre-fix vs post-fix evidence.

## Status

- Waiting for instrumentation and production reproduction.

# 0003. TypeScript, Next.js, Supabase and Vercel

Date: 2026-10-07
Status: Proposed

## Context

We need a database, logins without passwords, scheduled jobs and cheap
hosting, and tools that are well documented so Claude Code and any future
helper can work on them easily.

## Decision

TypeScript throughout; Next.js for the web app; Supabase (Postgres) for the
database, login and row-level permissions; Vercel for hosting in a UK/EU
region. Email via Postmark or Resend; AI extraction via the Claude API.

## Consequences

Free or near-free at pilot size, with a real database we can move elsewhere
if needed (Postgres is standard). We depend on two hosted providers; daily
backups and keeping data in plain Postgres limit the lock-in.

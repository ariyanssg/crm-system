# CRM System

A subscription CRM for businesses that resell shared and individual software accounts. Admins manage products, the master accounts behind them, customer subscriptions and support tickets. Customers get their own portal to see what they've bought, raise issues and follow replies.

Built with **Next.js (App Router)**, **Supabase** (Postgres, Auth, Row Level Security, Edge Functions) and **shadcn/ui**.

## Features

**Admin console**
- **Dashboard and analytics:** active subscriptions, revenue and expiring plans at a glance
- **Products:** shared (seat-based, with a slot limit) or individual, with price and billing cycle
- **Master accounts:** the real accounts behind each product. Passwords are encrypted with AES-256 before they are stored, and only admins can decrypt them
- **Subscriptions:** assign customers to a master account with live remaining-slot checks, bulk-add by email, and export the list to PDF
- **Customers, issues and notifications:** full customer records, a ticketing system with internal-only comments, and in-app notifications

**Customer portal**
- My products with renewal dates
- Open and track support issues
- Notifications and profile settings

**Platform**
- Email/password auth with sign-up, password reset and role-based routing (`admin` / `customer`)
- Row Level Security on every table, so customers can only ever read their own data
- Audit-log and notification triggers in the database
- An `auto-renew` Edge Function that extends subscriptions on a schedule

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui (Radix), cmdk, sonner |
| Forms and validation | React Hook Form, Zod |
| Backend | Supabase Postgres, Auth, RLS, Edge Functions (Deno) |
| Documents | jsPDF + jspdf-autotable |

## Project structure

```
src/
  app/
    (auth)/        login, signup, reset-password
    admin/         dashboard, analytics, customers, products,
                   master-accounts, subscriptions, issues, notifications, settings
    portal/        dashboard, my-products, issues, notifications, profile
    api/encrypt/   admin-only encryption endpoint
  components/      ui primitives and layouts
  lib/             Supabase clients, encryption helpers
supabase/
  migrations/      schema, RLS policies, triggers
  functions/       auto-renew Edge Function
```

## Getting started

```bash
npm install
npm run dev
```

Create `.env.local` with:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for admin operations |
| `ENCRYPTION_KEY` | 64-character hex key (32 bytes) for AES-256 |

Apply the SQL files in `supabase/migrations` in order, then deploy the renewal function:

```bash
supabase functions deploy auto-renew
```

Schedule it with a Supabase cron job, and set `CRON_SECRET` on the function.

---

Built by [Mahmudul Hassan](https://github.com/ariyanssg)

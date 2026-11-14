# PulseFit — Gym Management ERP (frontend)

A frontend-only gym ERP with three separate panels: **Owner/Admin**, **Receptionist (Front Desk)** and **Member**.
There's no backend yet: everything runs on generated demo data saved in the browser's `localStorage`, behind a
service layer that can be swapped for real API calls later.

## Run

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # typecheck + production build
```

## Demo accounts

| Role          | Email                   | Password       |
|---------------|-------------------------|----------------|
| Owner / Admin | admin@gymdemo.com       | admin123       |
| Receptionist  | reception@gymdemo.com   | reception123   |
| Member        | member@gymdemo.com      | member123      |

Any seeded member that has an email can also sign in with `member123`. To restore the original sample data, go to
**Admin → Backup & Restore → Reset demo data**.

## Stack

React 18 + Vite + TypeScript, Tailwind CSS, shadcn-style components on Radix primitives, Framer Motion,
GSAP (startup loader), Recharts, React Router, React Hook Form + Zod, jsPDF (receipts and reports), SheetJS (Excel).

## Architecture

```
src/
  types/                 domain models (Member, Membership, Payment, ExtraCharge, Expense, Staff…)
  services/
    storage/localStore   the only module that touches localStorage
    storage/db           cached in-memory DB + subscribe/commit (replace with HTTP later)
    mock/seed            deterministic demo data relative to today's date
    gymService           async business operations (register, renew, collect, mark attendance…)
    authService          demo login / session
    selectors            derived index: member status, dues, latest membership, today's attendance
    exports/             Excel, PDF (receipts + reports), print
  hooks/                 useGym (data + skeleton timing), useMyAccount (member-scoped data), utils
  contexts/              Auth (session, permissions, panel base path), Theme (light/dark/system)
  components/            ui primitives, layout (sidebar, topbar, bottom nav), tables, charts, forms, modals, loaders
  panels/{admin,receptionist,member}/nav.ts   navigation per panel
  pages/{auth,admin,receptionist,member,shared}
  routes/                route table + role/permission guards
```

Pages never read storage directly. They call `useGym()` to read data and `*Service` functions to change it. To add a
backend, re-implement `services/storage/db.ts` and the service functions with HTTP calls; the page components can stay
as they are.

### Business rules (in the frontend)

- Membership expiry = start date + plan months − 1 day.
- Member status: **inactive** (deactivated by staff) → **expired** (latest plan ended) → **active**.
- Attendance: one check-in per member per calendar day. Expired or inactive members are blocked; the owner can allow
  a one-time override.
- Partial payments leave a balance on the membership. Extra charges are collected in full and generate a receipt.
- Member IDs (`GYM-1001…`) and receipt numbers (`RCP-10001…`) come from counters, and both prefixes can be changed in
  Gym Settings.
- The owner can toggle receptionist permissions (register, edit, delete, collect, discount, charges, attendance,
  renew, payment history). Owner-only areas (profit, expense reports, backups, settings, staff, activity logs) are
  never shown to receptionists.
- Members only see their own data through `useMyAccount()`.

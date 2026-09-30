# AGRO JET 🚀

Agritech marketplace with multi-currency **BMONI escrow rails**: corporate offtake matching, harvest produce marketplace, group import pooling, agri-input purchases, NIBSS BVN KYC, and a smart 4-stage escrow ledger.

**Stack (industry-standard, 2026):**

| Layer      | Tech                                                                 |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | React 19 + Vite + Tailwind CSS v4 (SPA)                              |
| Backend    | Django 5 + Django REST Framework                                     |
| Auth       | SimpleJWT (access/refresh tokens, role claims) + Argon2 hashing      |
| Database   | PostgreSQL (Neon serverless) — SQLite for local dev                  |
| Docs       | drf-spectacular → OpenAPI 3 schema + Swagger UI at `/api/docs/`      |
| Hosting    | Vercel (SPA static + Django serverless functions, single project)    |

---

## 📁 Repository layout

```
agro_jet/
├── frontend/                 # React SPA (Vite + Tailwind v4)
│   ├── src/
│   │   ├── api.js            # API client (JWT handling, refresh-on-401)
│   │   ├── App.jsx           # Auth gate → user or admin dashboard
│   │   └── components/
│   │       ├── AuthView.jsx         # Login / onboarding (JWT)
│   │       ├── UserDashboard.jsx    # Marketplace, escrow, KYC, listings
│   │       ├── AdminDashboard.jsx   # KPIs, user directory, escrow table
│   │       └── PaymentModal.jsx     # BMONI checkout modal
│   └── .env.example
├── backend/
│   ├── entrypoints/          # Django project (settings split local/production)
│   ├── accounts/             # Custom User model (roles), JWT auth, BVN KYC
│   ├── marketplace/          # Buyers, produce, inputs, pools, escrow, payments
│   ├── core/                 # env helper, admin branding, seed command
│   └── .env.example
├── vercel.json               # Single-project deployment config
└── .env.example pointers
```

---

## 🔑 Demo accounts (created by the seed command)

| Role   | Email                   | Password       | Notes                          |
| ------ | ----------------------- | -------------- | ------------------------------ |
| Admin  | `admin@agrojet.africa`  | `AgroJet2026!` | Sees the admin dashboard       |
| Farmer | `farmer@agrojet.africa` | `AgroJet2026!` | Funded sandbox wallet          |
| Buyer  | `buyer@agrojet.africa`  | `AgroJet2026!` | Buyer/offtaker role            |

> ⚠️ Change these immediately in production (Django admin → Users, or
> `python manage.py changepassword <email>`).

**Sandbox test BVNs** (NIBSS mock registry): `95888168924` (Bunch Dillon),
`22222222222` (Samson Jabo), `33333333333` (Amina Abubakar). Any other 11-digit
BVN is rejected — that is expected.

---

## 💻 Local development

Prerequisites: Python 3.12+, Node 20+.

```bash
# --- Backend (SQLite, port 8000) ---
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo          # demo users + catalog + sample escrow
python manage.py runserver

# --- Frontend (port 5173) ---
cd frontend
npm install
cp .env.example .env                # VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173 and sign in with `farmer@agrojet.africa / AgroJet2026!`.
Django admin: http://localhost:8000/admin/ · API docs: http://localhost:8000/api/docs/

**Tests:** `cd backend && python manage.py test` (22 tests: auth, KYC, escrow
lifecycle, payments, pool joins, admin permissions).

---

## 🚀 Deployment guide (Vercel + Neon)

### 1. Create the Neon Postgres database

1. Sign up at https://neon.tech (free tier is enough) → **Create project**, e.g. `agrojet`.
2. Open **Dashboard → Connection Details** and pick the **Pooled** connection
   string (port `6543` — required for serverless). It looks like:
   ```
   postgresql://<user>:<password>@<ep-name>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```
3. Keep this string — it is `DATABASE_URL` below.

### 2. Import the repo on Vercel (one project serves frontend + API)

1. Push this repo to GitHub (see next section), then on https://vercel.com
   click **Add New → Project** and import `Codeswimer/agro_jet`.
2. Vercel auto-detects `vercel.json`: the SPA is static-built and every
   `/api/*`, `/admin/*`, `/static/*`, `/health` request is routed to the
   Django serverless function. **No framework preset changes needed.**

### 3. Environment variables (Vercel → Settings → Environment Variables)

| Variable                 | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `DJANGO_SETTINGS_MODULE` | `entrypoints.settings.production`                                     |
| `DJANGO_SECRET_KEY`      | Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DJANGO_DEBUG`           | `0`                                                                   |
| `DATABASE_URL`           | your Neon **pooled** connection string (`?sslmode=require`)           |
| `DJANGO_ALLOWED_HOSTS`   | `.vercel.app` (add your custom domain later if any)                   |
| `CORS_ALLOWED_ORIGINS`   | `https://<your-frontend-domain>.vercel.app` (the same project URL)    |
| `CSRF_TRUSTED_ORIGINS`   | `https://<your-project>.vercel.app`                                   |
| `VITE_API_URL`           | `https://<your-project>.vercel.app` (frontend talks to same origin)   |

### 4. Deploy, then run migrations + seed against Neon

Deploy once (any git push), then from your machine:

```bash
cd backend
export DJANGO_SETTINGS_MODULE=entrypoints.settings.production
export DATABASE_URL="<your neon pooled url>"
export DJANGO_SECRET_KEY="<same as vercel>"
python manage.py migrate
python manage.py seed_demo          # creates admin/farmer/buyer + catalog
python manage.py collectstatic --noinput   # optional (assets also served from finders)
```

> Tip: `python manage.py createsuperuser` also works if you prefer your own
> admin credentials instead of the seeded ones.

### 5. Verify the deployment

```bash
curl https://<your-project>.vercel.app/health
# → {"status": "ok", "service": "agrojet-backend"}

curl -X POST https://<your-project>.vercel.app/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@agrojet.africa","password":"AgroJet2026!"}'
# → {"access": "...", "refresh": "...", "user": {...}}
```

Then open `https://<your-project>.vercel.app`, log in as the admin, and check
the admin dashboard loads KPIs.

---

## 🔗 Useful URLs (production)

| URL              | What                                       |
| ---------------- | ------------------------------------------ |
| `/`              | React SPA (login → user/admin dashboard)   |
| `/admin/`        | Django admin (data management)             |
| `/api/docs/`     | Swagger UI for the whole REST API          |
| `/api/schema/`   | Raw OpenAPI 3 schema                       |
| `/health`        | Health check                               |

## 🧱 API surface (summary)

```
POST /api/auth/register/          farmer/buyer self-registration
POST /api/auth/login/             JWT login (returns profile + role claim)
POST /api/auth/refresh/           rotate access token
GET  /api/auth/me/                current profile (PATCH to update)
POST /api/kyc/bvn-verify/         NIBSS sandbox BVN check → KYC tier 2
GET  /api/marketplace/buyers/     corporate offtake catalog (search/filter)
GET  /api/marketplace/produce/    harvest listings
POST /api/marketplace/produce/new/  publish a listing (auth)
GET  /api/marketplace/inputs/     agri-input merchants
GET  /api/marketplace/pools/      group import pools (live status)
GET  /api/wallet/                 NGN / cNGN / USDB balances
POST /api/payments/initialize/    start BMONI checkout (creates escrow draft)
POST /api/payments/confirm/       settle payment → lock escrow funds
GET  /api/payments/               your payment history
GET  /api/escrows/                your escrow ledger
POST /api/escrows/:id/release/    verify quality → release to seller
GET  /api/admin-panel/stats/      admin KPIs (staff only)
GET  /api/admin-panel/users/      user directory (staff only)
GET  /api/admin-panel/escrows/    all contracts (staff only)
```

## 🔐 Security checklist (already implemented)

- ✅ Argon2 password hashing, Django password validators
- ✅ JWT with role claims, 60-min access / 7-day refresh, rotate on refresh
- ✅ CORS restricted to whitelisted origins; credentials allowed
- ✅ CSRF trusted origins for cookie-based admin flows
- ✅ HSTS (1 year, preload), SSL redirect, secure cookies, nosniff, X-Frame DENY
- ✅ `DEBUG=0` in production; secrets only via environment variables
- ✅ Admin-role accounts cannot self-register (API rejects role=ADMIN)
- ✅ `.env*` files are git-ignored except `.env.example`

## 🧭 Operating the platform day-to-day

- **Manage data** (buyers, pools, produce, inputs, users, wallets):
  Django admin at `/admin/` — every model is registered with search/filters.
- **Watch escrow flow**: Admin dashboard → Escrow Contracts (platform-wide table).
- **Release funds**: buyers from their ledger tab, or admins from the API/admin.
- **Customize demo data**: edit `backend/core/management/commands/seed_demo.py`,
  then re-run `python manage.py seed_demo --flush`.
- **Rotate the JWT secret**: set a new `DJANGO_SECRET_KEY` in Vercel (logs
  everyone out; refresh tokens become invalid).

## 📌 What to keep safe after this project

1. **GitHub repo access** — your PAT or account with access to `Codeswimer/agro_jet`.
2. **Vercel account + project** — team/project name, deployment domain.
3. **Neon Postgres** — project name, `DATABASE_URL` (pooled + direct strings),
   and the Neon console login. *This is the only copy of your data.*
4. **`DJANGO_SECRET_KEY`** — store it in a password manager; losing it invalidates
   sessions/tokens (data is unaffected).
5. **Admin credentials** — `admin@agrojet.africa` (or your superuser) — change
   the seeded password on first login.
6. **Local `.venv`** — disposable; recreate from `requirements.txt` anytime.

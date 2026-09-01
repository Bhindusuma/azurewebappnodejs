# Kiln

An online learning web app — courses, lessons, enrolment, progress tracking and a
per-lesson comprehension check — built to run on **Azure App Service for Linux**.

Server-rendered Express + EJS. No build step, no client framework, no native
dependencies, so a zip deploy just works.

---

## Run it locally

```bash
npm install
cp .env.example .env        # set JWT_SECRET to anything long
npm run dev
# http://localhost:8080
```

With no `DATABASE_URL` set, the app uses a seeded in-memory store: three courses,
twelve lessons. Create an account and enrol — nothing external is needed.

---

## What makes it App Service compatible

These are the things that break Node apps on App Service, and how each is handled.

| Requirement | Where it lives |
|---|---|
| Read the injected `PORT`, bind `0.0.0.0` | `src/config.js`, `server.js` |
| Explicit startup command (`node server.js`) | `infra/main.bicep` → `appCommandLine` |
| Trust the front-end proxy so `secure` cookies work | `app.set('trust proxy', 1)` in `src/app.js` |
| Config from App Settings, never from a deployed file | `src/config.js`; refuses to start in production without `JWT_SECRET` |
| Health probe the platform can use | `GET /healthz` (checks the database), `GET /readyz` (liveness only) |
| Survive scale-out to several instances | Stateless JWT cookie sessions, not in-process sessions |
| Graceful shutdown on `SIGTERM` (restarts, swaps, scale-in) | `server.js` |
| Logs to stdout as one JSON line per event | `src/app.js` (morgan + `console.log`) |
| No writes to the local filesystem | All state is in the database |
| Node version pinned in one place | `engines` in `package.json`, `linuxFxVersion` in Bicep |

Nothing is written to disk at runtime. App Service gives you a persistent `/home`,
but it is Azure Files behind the scenes — usable for uploads, a bad place for a
database file.

---

## Deploy

### 1. Provision

```bash
az group create -n kiln-rg -l centralindia

az deployment group create -g kiln-rg -f infra/main.bicep \
  -p namePrefix=kiln jwtSecret="$(openssl rand -base64 32)"
```

That creates the Linux plan, the web app on `NODE|22-lts`, a staging slot,
Application Insights, and diagnostic settings pointed at Log Analytics. It also
turns on Always On, HTTPS-only, and the health check at `/healthz`.

### 2. Ship code

Either push to `main` and let `.github/workflows/azure-webapp.yml` run, or deploy
by hand:

```bash
npm ci --omit=dev
zip -r release.zip . -x '.git/*' '.github/*' 'infra/*'
az webapp deploy -g kiln-rg -n kiln-web --src-path release.zip --type zip
```

The workflow deploys to the **staging slot** and swaps. The swap is warmed up by
pinging `/readyz` first, so production never receives traffic from a cold process.

### 3. Move off the in-memory store

The in-memory store is for local work. It loses everything on restart, and two
instances see two different sets of progress. For anything real:

```bash
az postgres flexible-server create -g kiln-rg -n kiln-db \
  --tier Burstable --sku-name Standard_B1ms --version 16

az webapp config appsettings set -g kiln-rg -n kiln-web --settings \
  DATABASE_URL="postgresql://user:pass@kiln-db.postgres.database.azure.com:5432/kiln?sslmode=require"

DATABASE_URL="..." npm run db:migrate      # creates tables, inserts the courses
```

Restart the app and check `/healthz` — `driver` should now read `postgres`.

### 4. Secrets

Put `JWT_SECRET` and `DATABASE_URL` in Key Vault and reference them from App
Settings rather than storing the values:

```
@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/jwt-secret/)
```

The web app and its slot both have a system-assigned managed identity; grant each
one `Key Vault Secrets User` on the vault. The Bicep template outputs the
principal IDs.

---

## Watching it run

```bash
az webapp log tail -g kiln-rg -n kiln-web        # live stdout
```

Request logs are one JSON object per line, which means you can query them in Log
Analytics without parsing text. Application Insights is wired up by the connection
string in App Settings.

---

## Layout

```
server.js               listen, shutdown
src/config.js           environment, fails fast on missing production config
src/app.js              middleware order, security headers, error handling
src/db/                 store interface, memory + postgres drivers, schema, seed
src/middleware/auth.js  cookie sessions
src/routes/             health, auth, learning
src/views/              EJS templates
public/css/app.css      the whole stylesheet
infra/main.bicep        App Service, slot, insights, diagnostics
```

`DESIGN.md` explains the interface decisions.

---

## Before this carries real users

- Password reset and email verification — neither exists yet.
- Token revocation. A signed cookie stays valid until it expires; add a token
  version column on `users` and check it in `loadUser` if you need instant sign-out.
- Rate limiting is currently per-instance and in-memory. Behind more than one
  instance, back it with Redis.
- An instructor role that can author courses. The schema has `role`; nothing uses it.
- Video hosting. Put media in Blob Storage behind Azure CDN, not in the app.

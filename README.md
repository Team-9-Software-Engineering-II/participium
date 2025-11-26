# Participium

Participium is a full-stack civic-engagement platform that lets citizens submit issues and allows municipal teams to triage, assign, and resolve them. The published Docker image bundles:

- Vite/React single-page frontend.
- Express API with Passport authentication and Sequelize ORM.
- Pre-seeded SQLite database plus file uploads support.

The container exposes both the UI and API on port `3000`, so third parties can deploy the entire stack with a single command.

## Quick start (Docker Hub consumers)

```bash
docker pull shayanizadi23/participium:latest

docker run -d --name participium -p 3000:3000 -e SESSION_SECRET='8Qz!m29sWf4B#1tKjLx0v^RzPpDnCy7h' -e SESSION_COOKIE_SECURE=false -e CLIENT_ORIGIN=http://localhost:3000 -e DB_SYNC_FORCE=false participium:latest
```

Once the container is healthy, open `http://localhost:3000`. The initial seed inserts demo admin—log in as `admin@participium.com` with password `password123` and municiplaity officer with email `officer@municipality.com` with the same password.
You can register as new citizen user and also as admin define technical staff memebrs.

### Persisting data

- `participium_db` keeps the SQLite file (`/app/server/data/database.sqlite`).
- `participium_uploads` stores files uploaded through the UI.
- To reset demo content, remove the DB volume or set `DB_SYNC_FORCE=true` for a single run.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port exposed by Express for both UI and API. |
| `CLIENT_ORIGIN` | `http://localhost:5173` (dev) / `http://localhost:3000` (prod) | Comma-separated list of origins allowed via CORS. Use `*` to reflect the request origin dynamically. |
| `SESSION_SECRET` | `participium-session-secret` | Secret used to sign session cookies. Always override in production. |
| `SESSION_COOKIE_SECURE` | `NODE_ENV === "production"` | Force secure cookies. Set to `false` when serving the container over plain HTTP (typical for localhost). |
| `SESSION_COOKIE_SAMESITE` | `lax` | Adjust to `none` if the UI and API live on different domains. |
| `DB_PATH` | `/app/server/data/database.sqlite` | Absolute or relative path to the SQLite DB file. Useful when mounting a custom volume. |
| `DB_SYNC_FORCE` | `true` (unless overridden) | Drops and recreates tables on startup. Set `false` for persistent deployments. |
| `DB_SYNC_ALTER` | `false` | Enables Sequelize `alter` sync without dropping tables. Only consulted when `DB_SYNC_FORCE=false`. |
| `SKIP_DB_SEED` | `false` | Skip inserting demo data (set to `true` for production environments that manage their own data). |
| `DB_LOGGING` | `true` | Emit SQL statements to the container logs. Set to `false` to silence. |
| `CLIENT_BUILD_DIR` | `server/public` | Optional override when serving a custom client bundle. |

### Session secret guidance

Use a cryptographically strong random string (≥32 chars). Example generation commands:

```bash
openssl rand -base64 48
# or
pwgen -s 64 1
```

Rotate the value if you suspect exposure; restarting the container with a new secret invalidates existing sessions.

## Operational tips

- **Behind HTTPS/reverse proxy**: keep `SESSION_COOKIE_SECURE=true` and set `CLIENT_ORIGIN` to the public hostname (e.g., `https://civic.example.com`).
- **Multiple tenants**: run separate containers with distinct DB volumes and secrets to isolate data per municipality.
- **Monitoring**: inspect logs with `docker logs participium`—authentication events, seed progress, and SQL statements are logged there.
- **Upgrades**: pull the new tag, stop the running container, start a new one with the same volumes to keep data intact.

For source-based customizations, clone the repo and rebuild the image locally (`docker build -t participium:latest .`) before publishing to Docker Hub.

# Participium

Participium is a full-stack civic-engagement platform that enables citizens in Torino to submit reports of existing problems (such as potholes, broken streetlights, or other municipal issues) and allows the municipality to efficiently triage, assign, and resolve them. The platform facilitates communication between citizens and municipal teams, ensuring that community issues are tracked and addressed systematically.

## 🏗️ Architecture

Participium consists of:

- **Frontend**: Vite/React single-page application with modern UI components
- **Backend**: Express.js API with Passport authentication and Sequelize ORM
- **Database**: SQLite database with pre-seeded demo data
- **Cache**: Redis for session management and caching
- **File Storage**: Support for image uploads (photos of reported issues)

## 📋 Prerequisites

Before running the project locally, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **Docker Desktop** (required for Redis - must be running before starting the server)

> ⚠️ **Important**: Docker Desktop must be running before starting the server, as the server requires Redis which runs in a Docker container.

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Team-9-Software-Engineering-II/participium.git
cd participium
```

### 2. Start Docker Desktop

**Open Docker Desktop and ensure it is running** before proceeding. When you run `npm run dev` or `npm start`, the scripts will automatically:
- Pull the Redis Docker image (if needed)
- Start Redis in a Docker container using Docker Compose
- Wait for Redis to be ready before starting the server

### 3. Install Dependencies

Install dependencies for both client and server:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Configure Environment Variables

The server uses environment variables for configuration. You can create a `.env` file in the `server` directory if needed, or use the defaults.

> 📝 **Note**: The `.env` file template can be accessed from the Elaborati section of student Shayan Izadi for SMTP configuration.

Key variables include:

- `PORT`: Server port (default: `3000`)
- `CLIENT_ORIGIN`: CORS origin (default: `http://localhost:5173` for dev)
- `SESSION_SECRET`: Secret for session cookies
- `DB_SYNC_FORCE`: Whether to recreate database tables (default: `true` in dev)
- `SKIP_DB_SEED`: Skip seeding demo data (default: `false`)

### 5. Start the Server

**Important**: Make sure Docker Desktop is open and running before starting the server.

From the `server` directory:

```bash
npm run dev
```

Or for production:

```bash
npm start
```

Both commands will automatically:
1. Pull the Redis Docker image (if not already available)
2. Start Redis in a Docker container (if not already running)
3. Wait for Redis to be ready
4. Start the Express server (with hot-reload for `dev`, production mode for `start`)

The server will be available at `http://localhost:3000`

### 6. Start the Client

In a new terminal, from the `client` directory:

```bash
npm run dev
```

The client will be available at `http://localhost:5173`

### 7. Access the Application

Open your browser and navigate to `http://localhost:5173`

## 🔑 Default Login Credentials

The application comes with pre-seeded demo accounts:

- **Admin**: 
  - Email: `admin@participium.com`
  - Password: `password123`

- **Municipality Officer**:
  - Email: `officer@municipality.com`
  - Password: `password123`

You can also register as a new citizen user, and admins can define technical staff members through the admin interface.

## 🐳 Docker Deployment (Production)

For production deployments, you can use the pre-built Docker image from Docker Hub:

### Quick Start with Docker

```bash
docker pull shayanizadi23/participium:latest

docker run -d \
  --name participium \
  -p 3000:3000 \
  -e SESSION_SECRET='your-secure-secret-here' \
  -e SESSION_COOKIE_SECURE=false \
  -e CLIENT_ORIGIN=http://localhost:3000 \
  -e DB_SYNC_FORCE=false \
  shayanizadi23/participium:latest
```

Once the container is healthy, open `http://localhost:3000`. The Docker image bundles both the frontend and backend, serving them from a single container.

### Persisting Data

To persist data across container restarts, use Docker volumes:

```bash
docker run -d \
  --name participium \
  -p 3000:3000 \
  -v participium_db:/app/server/data \
  -v participium_uploads:/app/server/uploads \
  -e SESSION_SECRET='your-secure-secret-here' \
  -e DB_SYNC_FORCE=false \
  shayanizadi23/participium:latest
```

- `participium_db`: Stores the SQLite database file
- `participium_uploads`: Stores files uploaded through the UI

To reset demo content, remove the DB volume or set `DB_SYNC_FORCE=true` for a single run.

## ⚙️ Configuration

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
| `DB_LOGGING` | `true` | Emit SQL statements to the container logs. Set `false` to silence. |
| `CLIENT_BUILD_DIR` | `server/public` | Optional override when serving a custom client bundle. |

### Session Secret Guidance

Use a cryptographically strong random string (≥32 chars). Example generation commands:

```bash
openssl rand -base64 48
# or
pwgen -s 64 1
```

Rotate the value if you suspect exposure; restarting the container with a new secret invalidates existing sessions.

## 🧪 Testing

Run tests for the server:

```bash
cd server
npm test
```

## 📝 Scripts

### Server Scripts

- `npm run dev` - Start development server with hot-reload (automatically pulls Redis image and starts Redis container if needed)
- `npm run start` - Start production server (automatically pulls Redis image and starts Redis container if needed)
- `npm run test` - Run test suite
- `npm run redis:up` - Start Redis container manually (requires Docker Desktop to be running)

### Client Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Troubleshooting

### Redis Connection Issues

If you encounter Redis connection errors:

1. **Open Docker Desktop and ensure it is running** - The server requires Docker Desktop to be active and running
2. The `npm run dev` or `npm start` commands will automatically pull the Redis image and start the container if Docker Desktop is running
3. Check if Redis container is running: `docker ps | grep redis`
4. Manually start Redis: `cd server && npm run redis:up` (only if automatic startup fails)
5. Verify Redis is accessible: `docker exec participium-redis-dev redis-cli ping` (should return `PONG`)

### Port Already in Use

If port 3000 or 5173 is already in use:

- Change the server port: Set `PORT` environment variable
- Change the client port: Modify `vite.config.js` or use `npm run dev -- --port <port>`

### CORS Errors

If you see CORS errors in the browser:

- Ensure `CLIENT_ORIGIN` matches your frontend URL (default: `http://localhost:5173`)
- Check that the server is running and accessible

## 💡 Operational Tips

- **Behind HTTPS/reverse proxy**: Keep `SESSION_COOKIE_SECURE=true` and set `CLIENT_ORIGIN` to the public hostname (e.g., `https://civic.example.com`).
- **Multiple tenants**: Run separate containers with distinct DB volumes and secrets to isolate data per municipality.
- **Monitoring**: Inspect logs with `docker logs participium`—authentication events, seed progress, and SQL statements are logged there.
- **Upgrades**: Pull the new tag, stop the running container, start a new one with the same volumes to keep data intact.

## 🏗️ Building from Source

For source-based customizations:

```bash
# Build the Docker image locally
docker build -t participium:latest .

# Run the locally built image
docker run -d --name participium -p 3000:3000 participium:latest
```

## 📄 License

See [LICENSE.md](LICENSE.md) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

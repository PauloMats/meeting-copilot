# Deployment

## Railway API service

Railway should deploy the API as a monorepo service using the repository root. Railway reads
`railway.json` automatically, which points the service to `Dockerfile.api`.

Use Docker for the API service. In this repo it is simpler than Nixpacks because the service is part
of a pnpm monorepo, depends on local workspace packages, and must run database migrations before
starting the server.

## Step-by-step

1. Open Railway and create a new project.
2. Add a PostgreSQL database service.
3. Add a new service from the GitHub repository `PauloMats/meeting-copilot`.
4. Keep the service root as `/`.
5. Railway should detect `railway.json` and use `Dockerfile.api`.
6. In the API service variables, paste the variables below.
7. Generate a long random value for `DESKTOP_API_KEY`; the same value must be configured in the
   desktop app `.env`.
8. Deploy.
9. Open the generated Railway domain and validate `/api/health`.

Required variables:

```env
OPENAI_API_KEY=...
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_USER_EMAIL=local@meeting-copilot.invalid
DESKTOP_API_KEY=generate-a-long-random-secret
CORS_ORIGIN=*
OPENAI_ANSWER_MODEL=gpt-5.4-nano
OPENAI_ANSWER_MODEL_BASIC=gpt-5.4-nano
OPENAI_ANSWER_MODEL_BALANCED=gpt-5.4-mini
OPENAI_ANSWER_MODEL_ADVANCED=gpt-5.4
OPENAI_ANSWER_MAX_OUTPUT_TOKENS=520
OPENAI_ANSWER_CONTEXT_CHARS=6000
OPENAI_RETRIEVAL_LIMIT=0
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-realtime-whisper
RETRIEVAL_PROVIDER=none
```

Do not copy these local development variables into Railway:

```env
API_HOST=127.0.0.1
API_PORT=3333
API_BASE_URL=http://127.0.0.1:3333
```

Railway injects `PORT`; the API reads it automatically and binds to `0.0.0.0` when Railway
environment variables are present. The Docker image runs database migrations before starting the
Fastify server.

After deploy, validate:

```bash
curl https://your-service.up.railway.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "providers": {
    "openai": true,
    "database": true,
    "retrieval": "none"
  }
}
```

## Desktop pointing to Railway

Create a `.env` next to the portable executable, or in the installed app user data folder:

```env
API_BASE_URL=https://your-service.up.railway.app
```

The desktop app keeps the OpenAI API key out of the client. It only talks to the backend.

If `DESKTOP_API_KEY` is configured in Railway, add the same value to the desktop `.env`:

```env
DESKTOP_API_KEY=generate-a-long-random-secret
```

For the portable executable, place this `.env` in the same directory as the `.exe`.

For the installed app, the most reliable option is setting user environment variables in Windows:

```powershell
setx API_BASE_URL "https://your-service.up.railway.app"
setx DESKTOP_API_KEY "generate-a-long-random-secret"
```

Close and reopen the desktop app after changing these values.

## Landing page

Local development:

```bash
pnpm dev:web
```

Production build:

```bash
pnpm web:build
```

# Deployment

## Railway API service

Railway should deploy the API as a monorepo service using the repository root and the custom
config file `railway.api.json`.

Required variables:

```env
OPENAI_API_KEY=...
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_USER_EMAIL=local@meeting-copilot.invalid
CORS_ORIGIN=*
OPENAI_ANSWER_MODEL=gpt-5.4-nano
OPENAI_ANSWER_MAX_OUTPUT_TOKENS=520
OPENAI_ANSWER_CONTEXT_CHARS=6000
OPENAI_RETRIEVAL_LIMIT=0
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-realtime-whisper
RETRIEVAL_PROVIDER=none
```

Railway injects `PORT`; the API reads it automatically. The Docker image runs database migrations
before starting the Fastify server.

After deploy, validate:

```bash
curl https://your-service.up.railway.app/api/health
```

## Desktop pointing to Railway

Create a `.env` next to the portable executable, or in the installed app user data folder:

```env
API_BASE_URL=https://your-service.up.railway.app
```

The desktop app keeps the OpenAI API key out of the client. It only talks to the backend.

## Landing page

Local development:

```bash
pnpm dev:web
```

Production build:

```bash
pnpm web:build
```

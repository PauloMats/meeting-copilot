# Local development

## WSL toolchain

The repository expects `/usr/bin/zsh`. Node.js 22.14.0 and Corepack were installed under
`~/.local/opt`, with shims in `~/.local/bin`. `~/.zprofile` adds both paths for login shells.

```bash
zsh -lc 'node --version && pnpm --version'
```

## Services

```bash
cd /home/paulomats/code/pessoal/meeting-copilot
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm dev:api
```

If Docker Desktop is running but its WSL integration is disabled, install the repository wrapper:

```bash
ln -sfn "$PWD/scripts/docker-wsl" "$HOME/.local/bin/docker"
rehash
docker compose up -d postgres
```

The API listens on `127.0.0.1:3333`. Configure `OPENAI_API_KEY` before transcription or answer
generation.

## Desktop development

For renderer/main-process UI development in WSL:

```bash
pnpm dev:desktop
```

WSLg can render Electron, but Windows system-audio loopback is an Electron-on-Windows capability.
For a real audio test, use a separate native Windows checkout so Linux and Windows native
`node_modules` never overwrite each other:

```powershell
git clone git@github.com:PauloMats/meeting-copilot.git $env:USERPROFILE\code\meeting-copilot
cd $env:USERPROFILE\code\meeting-copilot
Copy-Item .env.example .env
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-windows-desktop.ps1
```

Keep the API running in WSL. Windows forwards `127.0.0.1:3333` to the WSL service, and Docker
Desktop exposes PostgreSQL on `127.0.0.1:5432`.

## Database

```bash
pnpm db:generate
pnpm db:migrate
```

The initial migration enables `vector` before creating vector columns and indexes.

## Environment variables

| Variable                              | Purpose                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `API_HOST`, `API_PORT`                | Backend bind address                                            |
| `API_BASE_URL`                        | Desktop-to-backend URL                                          |
| `DATABASE_URL`                        | PostgreSQL connection                                           |
| `APP_USER_EMAIL`                      | Single-user bootstrap identity for the MVP                      |
| `OPENAI_API_KEY`                      | Backend-only provider credential                                |
| `OPENAI_ANSWER_MODEL`                 | Structured answer model; defaults to low-latency `gpt-5.4-mini` |
| `OPENAI_REALTIME_TRANSCRIPTION_MODEL` | Live transcription model                                        |
| `RETRIEVAL_PROVIDER`                  | `none`, `openai_file_search`, or `pgvector`                     |
| `OPENAI_VECTOR_STORE_ID`              | File search vector store                                        |
| `CORS_ORIGIN`                         | Renderer development origin                                     |
| `LOG_LEVEL`                           | Pino log level                                                  |
| `MEETING_COPILOT_ENV_FILE`            | Optional absolute override for the `.env` path                  |

## Checks

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

# Web deployment

The public website is a static React/Vite app located at `apps/web`.

## Recommended hosting

Use Vercel for the website and Railway for the API.

Do not upload desktop `.exe` files directly into the Git repository. Publish desktop builds through GitHub Releases and point the website download CTA to:

```text
https://github.com/PauloMats/meeting-copilot/releases/latest
```

## Vercel settings

Create a new Vercel project from the GitHub repository and use:

```text
Framework Preset: Vite
Root Directory: apps/web
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install --frozen-lockfile
```

The app is static and does not require environment variables for the first landing page version.

## Release flow for desktop downloads

1. Build the desktop app on Windows:

```powershell
pnpm desktop:dist:win
pnpm desktop:dist:win:installer
```

2. Create a GitHub Release.
3. Upload:
   - `apps/desktop/release/Meeting Copilot-*-setup-x64.exe`
   - `apps/desktop/release/Meeting Copilot-*-portable-x64.exe`
4. Keep the website CTA pointing to the latest release URL.


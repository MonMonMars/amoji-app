# Amoji

A cozy 3D AI companion for iPhone — chat, real voice, and a light raising-game loop, Cantonese-and-English-first. This repo is the fresh-build codebase: a portable parametric **emotion core** (`packages/emotion-core`), a pure **VRM frame mapper** (`packages/vrm-renderer`), and the **Next.js companion app** (`apps/web`).

## Commands

```bash
npx pnpm@9 install     # pnpm only — npm heap-crashes on this dependency family
pnpm dev               # start the web app (http://localhost:3000/play)
pnpm test              # run all package tests
pnpm typecheck         # typecheck all packages
pnpm build             # production build of the web app
```

## Secrets

Copy `llm-key.txt` content into `apps/web/.env.local` as `MOONSHOT_API_KEY=...` to enable the Moonshot LLM adapter. Without it the app runs in offline fallback mode. Secret files are gitignored — never commit them.

## Asset policy

Only assets with an entry in `apps/web/public/models/ASSET_MANIFEST.md` may ship; CI enforces this.

# PetPhotoRevive

Upload an old, blurry pet photo → AI restoration → watermarked preview → pay → clean high-resolution download.

See [CLAUDE.md](CLAUDE.md) for project context, [PROGRESS.md](PROGRESS.md) for current status, and
[照片修复站-MVP-建站指令.md](照片修复站-MVP-建站指令.md) / [照片修复站-等待期建站工单.md](照片修复站-等待期建站工单.md) for the full requirements.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in as needed — see that file for what each key does and
where to get it. With no keys set at all, the site runs fully in demo mode: a free key-less
restoration engine (`sharp-basic`) and a demo checkout that marks the job paid without a real charge.

## Restoration engine

`src/lib/engine/` — `getRestoreEngine()` picks `sharp-basic` (no key needed) unless
`REPLICATE_API_TOKEN` is set, in which case it switches to the real `replicate-realesrgan` engine.
No other code changes needed to go from placeholder to real restoration.

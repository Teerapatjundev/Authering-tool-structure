# Authoring Tool (`new-authoringtool`)

Canvas authoring tool built with **Next.js** (App Router), **React 19**, **Konva**, and **Zustand**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint (`eslint-config-next`) |

## Project structure

- `src/app/` — App Router routes (`/dashboard`, `/editor/[docId]`)
- `src/features/editor/` — Canvas editor (Konva, commands, stores)
- `src/services/api/` — Document persistence (IndexedDB)
- `src/components/ui/` — Shared UI (shadcn-style)

## Environment

Optional client env (create `.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=
```

## Cursor rules

See `.cursor/rules/` for AI/team conventions when editing this project.

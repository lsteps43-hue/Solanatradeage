# Meme Agent

Meme Agent is a paper-only Solana meme-market intelligence cockpit for deterministic discovery, risk analysis, historical replay, and evaluation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the agent overview, discovery, replay, decision log, and simulation contracts.
- `artifacts/api-server/src/routes/meme-agent.ts` — deterministic demo replay data, scoring evidence, risk gates, and paper replay behavior.
- `artifacts/meme-agent/src/App.tsx` — dashboard, discovery queue, replay lab, decision log, and simulations screens.
- `artifacts/meme-agent/src/index.css` — dashboard theme and visual tokens.

## Architecture decisions

- The first milestone is intentionally paper-only: there is no wallet connection, order routing, signing, or private-key path.
- The fast path is deterministic and keeps evidence separate from inference and unknowns; critical risk flags are not overridable by contextual reasoning.
- Replay runs use a fixed seed and explicit friction inputs (latency, slippage, fees) so experiments are reproducible.
- Decision log entries are append-only in the runtime surface and expose counts for evidence, risks, and unknowns rather than rewriting history.
- The current source adapters are replay fixtures so the dashboard is useful before connecting live Solana RPC, WebSocket, or Geyser-compatible feeds.

## Product

- Monitor the current OBSERVE → DISCOVER → ANALYZE loop and data-source health.
- Filter and inspect meme-token discoveries with opportunity, risk, and confidence scores.
- Review FACT / INFERENCE / UNKNOWN evidence, deterministic risk flags, and next actions.
- Run historical paper replays with capital, latency, slippage, and fee parameters.
- Review immutable decisions and compare simulation performance.

## User preferences

- Keep real-money execution out of the first milestone until replay and paper-trading performance is reliable and reproducible.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before using updated hooks or schemas.
- The frontend and API use separate managed workflows; restart both after contract or route changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

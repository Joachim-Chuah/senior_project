# CLAUDE.md

## Project Overview
Sentiviz is a real-time stock sentiment + confidence scoring dashboard for retail traders. It combines StockTwits social sentiment, a 6-signal confidence scorer, options chain data, and AI chat (Groq + Tavily) in a React UI.

- **Frontend**: React 19 + Vite + Tailwind at `frontend/` — dev server: `npm run dev` (port 5173)
- **Backend**: FastAPI (Python) at `backend/` — dev server: `uvicorn app.main:app --reload` (port 8000)
- **Deployed**: Frontend on Vercel (sentiviz.vercel.app), backend on Render
- **API keys**: Groq, Tavily, FMP live in `backend/.env`; Reddit creds are placeholders

## UI Constraints
- Layout is snap-scroll: each tab is exactly **100vh**. Do not add content that breaks this constraint or requires a new scroll section without explicit instruction.
- Demo mode (`VITE_DEMO_MODE=true`) swaps real components for mock ones. Never mix demo/mock data into real routes or production components.

## Testing Requirements

- Write unit tests for all new code before or alongside implementation
- Write unit tests for all existing code that lacks coverage when touching or modifying it
- Tests must cover expected behavior, edge cases, and failure modes
- All tests must pass before a change is considered complete

## Core Principles

### Simplicity First
Every change should be as simple as possible. Prefer the straightforward solution over the clever one. If a change feels complex, look for a simpler approach before proceeding.

### No Laziness
Find root causes — never apply temporary fixes or workarounds. If something is broken, understand why it is broken and fix the underlying issue. Patches that defer the problem are not acceptable.

### Minimal Impact
A change should only touch what is necessary to accomplish the goal. Avoid refactoring unrelated code, renaming things out of scope, or making improvements that aren't required by the task at hand.

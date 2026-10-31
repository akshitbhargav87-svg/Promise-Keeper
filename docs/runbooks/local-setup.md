# Local Development and Environment Setup Guide

Tested on Windows (PowerShell) and Linux/macOS/Container environments.

## Prerequisites

- **Node.js**: `v22.17.0+` (Node 22 LTS). Pinned in [.nvmrc](../../.nvmrc) and [.node-version](../../.node-version).
- **npm**: `10.9.2+` (or pnpm `12.11.2+`).
- **Python**: `3.11+` (for team coordination scripts).
- **Git**: `2.40+` with repository access.

## Quick Start (Synthetic Development)

Promise Keeper does **not** require real credentials or third-party accounts for synthetic development. Safe defaults are loaded automatically in `development` and `test` profiles.

1. **Clone the repository**:
   ```powershell
   git clone https://github.com/akshitbhargav87-svg/Promise-Keeper.git
   cd Promise-Keeper
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Verify planning tools and baseline**:
   ```powershell
   python scripts/check_repo.py
   python -m unittest discover -s tests -v
   ```

4. **Build monorepo workspaces**:
   ```powershell
   npm run build
   ```

5. **Start Web Application**:
   ```powershell
   npm run --workspace=@promise-keeper/web dev
   ```
   Open `http://localhost:3000` in your browser.
   Health check: `http://localhost:3000/api/health/live`.

6. **Start Worker**:
   ```powershell
   npm run --workspace=@promise-keeper/worker start
   ```

## Environment Profiles and Validation

Environment variables are validated strictly via typed schemas in `@promise-keeper/runtime`:

- **development**: Safe synthetic defaults loaded if missing; no real secrets required.
- **preview / production**: Requires dedicated database connection, real storage credentials, and a strong session secret (>= 32 chars). Synthetic defaults are rejected.
- **test**: Isolated in-memory/synthetic mode.

To customize local settings, copy the example file:
```powershell
Copy-Item .env.example .env
```

## Agreed Libraries and Versions

The following shared dependencies are agreed across all ten areas:
- **Form State**: `react-hook-form` (`^7.54.2`) with `@hookform/resolvers` and `zod`.
- **Server Query State**: `@tanstack/react-query` (`^5.64.2`).
- **Date / Time / Timezone**: `date-fns` (`^4.1.0`).
- **Database / Migrations**: `drizzle-orm` (`^0.38.4`), `drizzle-kit` (`^0.30.2`), PostgreSQL.
- **Model Adapter**: Hosted `gemma-4-26b-a4b-it` or self-hosted Gemma adapter.

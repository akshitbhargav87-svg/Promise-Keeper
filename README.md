# Promise Keeper

**One place to remember what brands promised you, notice what changed, and act with the evidence.**

Promise Keeper is planned as a complete responsive web platform: an evidence vault, automatic email tracking, a brand directory, promise timelines, subscription and offer tracking, a grounded assistant, and a reviewed action center.

This repository currently contains the product blueprint and working team-coordination tooling. The application itself has not been built. No email account, model endpoint, deployment, or hackathon submission has been activated.

## Start here

| Need | Read |
| --- | --- |
| Complete product, screens, interactions, business rules | [PRODUCT.md](PRODUCT.md) |
| Available areas and progress | [TASKS.md](TASKS.md), then `python scripts/coord.py list` for live state |
| How four people and their agents collaborate | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
| System design, storage, jobs, deployment | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Shared boundaries, API and event contracts | [docs/CONTRACTS.md](docs/CONTRACTS.md) |
| Ten execution areas, seven sequential tasks each | [docs/areas/README.md](docs/areas/README.md) |
| Release gates and end-to-end scenarios | [docs/QUALITY.md](docs/QUALITY.md) |
| Research, verified facts, assumptions | [docs/SOURCES.md](docs/SOURCES.md) |
| Decisions and change requests | [docs/DECISIONS.md](docs/DECISIONS.md), [docs/requests/README.md](docs/requests/README.md) |
| Demo and submission preparation | [docs/LAUNCH.md](docs/LAUNCH.md) |

## Give this repository to an AI

> Read AGENTS.md and follow it. Show the live unclaimed areas and first pending task in each. I am `<name>`; implement area `<A01..A10>` using agent ID `<tool-session>`. Claim the area remotely before editing application files. Keep TASKS.md on the coordination branch current. Follow the area tasks in order, respect owned paths and shared contracts, validate your work, and leave a precise handoff if anything remains.

For a status-only request:

> Read AGENTS.md. Fetch the live board, list unclaimed, in-progress, blocked, and review areas, and recommend the next tasks. Do not claim anything.

## Coordination quick start

Requires Python 3.11+ and Git, with ordinary repository push access. No Python packages or API tokens in command arguments are needed.

```powershell
python scripts/check_repo.py
python -m unittest discover -s tests -v
python scripts/coord.py list --offline
```

Once the blueprint is committed and pushed to the repository's actual default branch, one maintainer initializes the shared board:

```powershell
python scripts/coord.py init-remote --base main --owner YOUR_NAME
python scripts/coord.py list
python scripts/coord.py claim A04 --owner YOUR_NAME --agent YOUR_AGENT_SESSION
python scripts/coord.py start A04-T01 --owner YOUR_NAME
python scripts/coord.py note A04 --owner YOUR_NAME --message "Provider capability spike underway; no live credentials used."
```

Replace `main` if the actual default branch differs. Initialization refuses to replace an existing board. Remote updates use temporary clones; they do not switch or overwrite your feature branch. See the workflow for task review/completion and race behavior. Offline mode is read-only; it never grants a team claim.

## Proposed application stack

TypeScript monorepo, Next.js web app, Node worker, PostgreSQL, S3-compatible evidence storage, schema-validated Gemma adapters, PostgreSQL-backed jobs, and self-hostable containers. A01 pins tested package versions and creates the runnable app. A01 and A09 establish infrastructure and access controls; all other areas can begin against frozen contracts and synthetic fixtures.

Ten areas can start independently. Real integration and production readiness have dependencies; the plan states those explicitly instead of hiding them.

## License

MIT for this repository. Model weights, fonts, logos, SDKs, and other dependencies retain their respective licenses. See [LICENSE](LICENSE).

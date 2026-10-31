# Team and AI workflow

## What the coordination system actually guarantees

The live [TASKS.md](../TASKS.md) is stored on the remote `coordination` branch. Each update fetches that branch into an isolated temporary checkout, validates the actor and state transition, changes only TASKS.md, commits, and makes an ordinary fast-forward push. Two competing claims create sibling commits; the remote accepts one and rejects the other. The losing command refetches and rechecks ownership before doing anything. It never force-pushes.

This gives an authoritative shared claim for cooperative agents with repository access. It is not an access-control lock: a writer who bypasses the script can edit code or Git refs. Configure branch protection and code review if administrative enforcement is needed. Markdown on independent feature branches is only a snapshot and cannot provide live mutual exclusion.

The tool is synchronous, requires network and Git push access, and fails closed on remote failure. Offline listing is available; offline claims are deliberately unsupported. There is no silent stale-claim expiration. Claims remain until release/handoff/completion, so a disconnected agent cannot unexpectedly lose ownership mid-edit.

## First-time maintainer setup

1. Commit/push this blueprint to the repository's actual default branch. Preserve existing repository work if any.
2. Ensure `origin` points to `https://github.com/akshitbhargav87-svg/Promise-Keeper.git` and Git authentication is configured outside this repository.
3. Initialize exactly once:

```powershell
python scripts/coord.py init-remote --base main --owner YOUR_NAME
python scripts/coord.py list
```

`--base` must name the pushed branch containing this blueprint; it need not be `main`. Initialization uses the board from that branch and refuses to overwrite an existing coordination branch. It does not require a PAT in an environment variable, add broad permissions, or install a GitHub app.

If organizational protection prohibits direct writes to `coordination`, a maintainer must configure a suitable coordination ref or approved automation. Do not weaken protected branches to make the script pass. Until remote initialization succeeds, the board is a seed with no live claims and implementation must not pretend it has acquired one.

## Human identity and area selection

Owner is a stable, short human handle such as `akshit` or `tushar`, not an API key or email address. Agent is a nonsecret tool/session label such as `codex-laptop-1`. Each area has one accountable human and one current session. The owner is a cooperative assertion, not cryptographically authenticated by this script; Git credentials, review, and optional signed commits provide organizational identity controls. Do not impersonate another owner.

Keep one active area per person by default. The CLI rejects a second active claim for an owner. A finished area becomes available only if explicitly reopened through a reviewed plan change; do not reuse completed task IDs for new scope.

```powershell
python scripts/coord.py list
python scripts/coord.py claim A05 --owner akshit --agent codex-laptop-1
git switch -c codex/a05-akshit-brands-promises
python scripts/coord.py start A05-T01 --owner akshit
```

Create a separate clone for each agent/person. For worktrees, use separate working paths and branches and keep tool/session state isolated; the coordinator's temp checkout never touches the worktree. Do not edit two areas through the same agent session simultaneously.

## Sequential tasks, parallel areas

Every area has tasks T01–T07. Only the first unfinished task may start. Finish/review/approve that task before starting the next. Tasks end in `done` only after review evidence. “Ready to code against fixtures” and “real integration complete” are separate facts in area docs and checkpoint notes.

Consult [INTEGRATION.md](INTEGRATION.md) before planning a person’s next area. Dependencies are on implemented capabilities, usually T01–T06, rather than another area's completion status. With fewer people than areas, publish and release a blocked area so its owner can build an unclaimed prerequisite. Returning preserves its first unfinished task; this is an intentional rotation, not skipping task order.

Example normal task cycle:

```powershell
python scripts/coord.py note A05 --owner akshit --message "A05-T01: contracts mapped; brand alias decisions in PR #12."
python scripts/coord.py review A05-T01 --owner akshit --evidence "PR #12; unit checks passed; manual alias review recorded."
python scripts/coord.py done A05-T01 --owner akshit --reviewer tushar --evidence "PR #12 reviewed; fixture contract checks passed."
python scripts/coord.py start A05-T02 --owner akshit
```

`reviewer` must differ from owner. The tool records that declaration; it cannot prove an actual review happened. Link a real PR/review or reproducible checks. Human team members can review through their agents, but retain accountable names. Never invent a reviewer or evidence. If the current user is working alone, leave the task in review for a real later review, and explain why.

To return changes from review: `rework A05-T01 --owner akshit --message "Reviewer found alias collision; correcting."` The task returns to in_progress, preserving previous events. Completed tasks cannot be reset casually; a scope change needs a new approved task/version instead of rewriting completed history.

## Blockers and communication through files

```powershell
python scripts/coord.py block A05-T02 --owner akshit --message "Needs A01 typed DB port; CR-A05-T02-db-port requested."
python scripts/coord.py note A05 --owner akshit --message "Prepared contract fixtures; awaiting CR response. No live integration claim."
python scripts/coord.py resume A05-T02 --owner akshit --message "A01 port merged in PR #16; adapter implementation resumed."
```

Create a request from docs/requests/TEMPLATE.md with a unique area/task-based filename, e.g. `CR-A05-T02-db-port.md`. Push it on the area's feature branch/PR; reference the branch/PR and path in the live board note. The receiving area reads the request through Git, responds in the same PR/file, and records its own board note. Do not assume someone sees an unpushed file on your laptop.

The board is the small shared conversation index: current checkpoint, blocker, request/PR refs, next action. Long technical discussion belongs in a request/decision file. No asynchronous messaging service is installed. Agents discover updates by refreshing the board at session start, task boundaries, before ending, and before integration. This is explicit polling at meaningful checkpoints, not instantaneous live chat.

Request contents: producer/consumer owners; affected contract/version; precise proposed change; compatibility; fixtures; acceptance; migration; response owner; decision. For urgent shared changes, both owners stop editing the shared file until one change steward is agreed. Do not resolve shared code conflicts by overwriting the other implementation.

## Release, handoff, resume

```powershell
python scripts/coord.py handoff A05 --owner akshit --to tushar --agent claude-laptop-2 --message "A05-T03 in progress; branch codex/a05-akshit-brands-promises, PR #19, tests pass except timeline adapter. Next: wire event port."
python scripts/coord.py release A05 --owner tushar --message "PR #19 pushed; T03 still in progress; returning area to pool for reassignment."
```

Handoff transfers existing task state and checkpoint; recipient must read it and the current PR before editing. Handoff requires a target with no other active area. Release preserves all task progress and notes. A new claimant resumes the first unfinished task, not T01 by default. Uncommitted work must be committed to a safe feature branch or precisely handed off locally before releasing; the CLI cannot save code for you.

End every session with a note: branch/PR, last completed task, current task/state, exact checks/results, blocker/request, and next concrete action. No “all done” note if remote board update failed. Report the failure and leave the ownership claim intact.

## Area completion and integration

```powershell
python scripts/coord.py complete A05 --owner akshit --reviewer tushar --evidence "All seven tasks reviewed; PR #31 merged into main at abc123; integration J01/J03 passed against real services."
```

The script requires all tasks done and a distinct reviewer, but cannot query GitHub to prove merge/check claims. Reviewer verifies them before recording. `complete` is a team assertion with evidence, not automatic code verification. Complete only after the area definition of done, actual integration, and merged branch. Then the owner may claim another area. A10 cannot declare release until every area and release gate passes.

Default branch merges go through PRs. Feature PRs include area/task IDs, behavior, contract changes, validations, fixture/live-provider distinction, screenshots for UI, and outstanding risks. Use one meaningful PR per task or coherent adjacent scope; task order still applies. Never force-push the default/coordination branches. Use expand/contract migrations, narrow commits, and resolve integration against the current base.

## Snapshots, audit and repair

```powershell
python scripts/coord.py sync
python scripts/coord.py list --offline
python scripts/coord.py validate
```

`sync` fetches live state and replaces only the local TASKS.md snapshot; it refuses to replace a locally changed board. Snapshot refresh is optional on feature branches; a designated maintainer may include a recent snapshot in default-branch maintenance. The live coordination branch always wins over stale snapshots. Do not merge coordination into main; that branch is a status stream based on the seed tree, not an application integration branch.

Each update increments board revision and adds a timestamped event containing actor, action, subject, message/evidence. Full remote Git history provides another audit layer. Time is UTC in the board. Claims do not depend on laptop timezone.

If a board becomes invalid, stop automatic writes. A maintainer uses Git history to review the last valid board, prepares a repair commit without discarding events, and documents it. No `reset --hard` or force push as routine recovery. Lost owners require explicit user/maintainer authorization for a manual reassignment with a reason, reviewed commit, and preserved task state. The script intentionally has no stealth “steal” command.

## Review and branch protection recommendations

Enable required pull requests, passing planning/application CI, and at least one review on the default branch when the repository/account permits. Install/enable CODEOWNERS only with real usernames. A template is supplied, rather than routing reviews to invented users. Protect coordination from force pushes/deletion; direct ordinary pushes are required by this workflow. Administrative rules and account permissions must be configured by an authorized maintainer; repository files alone cannot enable them.

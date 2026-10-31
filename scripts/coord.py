#!/usr/bin/env python3
"""Single Markdown team board, updated through optimistic fast-forward Git pushes.

Only stdlib and Git are needed. Remote failures never grant an offline claim.
"""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
BRANCH = "coordination"
MARKER = re.compile(r"<!-- pk-state:start -->\n```json\n(.*?)\n```\n<!-- pk-state:end -->", re.S)
HANDLE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}\Z")
STATUSES = {"pending", "in_progress", "blocked", "review", "done"}


class CoordError(Exception):
    pass


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def catalog(root: Path = ROOT) -> tuple[dict, dict]:
    areas, tasks = {}, {}
    for path in sorted((root / "docs" / "areas").glob("A[0-9][0-9]-*.md")):
        content = path.read_text(encoding="utf-8")
        first = content.splitlines()[0].removeprefix("# ")
        area_id, name = first.split(" — ", 1)
        areas[area_id] = {"name": name, "path": path.relative_to(root).as_posix(),
                          "owner": "", "agent": "", "checkpoint": "", "completed": False}
        for task_id, title in re.findall(r"^### (A\d{2}-T\d{2}) — (.+)$", content, re.M):
            if task_id in tasks:
                raise CoordError(f"Duplicate task definition: {task_id}")
            tasks[task_id] = {"title": title, "status": "pending", "evidence": "", "reviewer": ""}
    if len(areas) != 10 or len(tasks) != 70:
        raise CoordError("Expected ten areas and seventy task definitions.")
    return areas, tasks


def seed(root: Path = ROOT) -> dict:
    areas, tasks = catalog(root)
    return {"schemaVersion": 1, "revision": 0, "updatedAt": "not initialized",
            "areas": areas, "tasks": tasks, "events": []}


def area_of(target: str) -> str:
    return target.split("-", 1)[0]


def area_tasks(state: dict, area: str) -> list[str]:
    return sorted(t for t in state["tasks"] if area_of(t) == area)


def first_unfinished(state: dict, area: str) -> str | None:
    return next((t for t in area_tasks(state, area) if state["tasks"][t]["status"] != "done"), None)


def validate_state(state: dict) -> None:
    try:
        if state["schemaVersion"] != 1 or type(state["revision"]) is not int or state["revision"] < 0:
            raise CoordError("Unsupported board schema/revision.")
        if set(state["areas"]) != {f"A{i:02}" for i in range(1, 11)}:
            raise CoordError("Board must contain A01 through A10.")
        if set(state["tasks"]) != {f"A{i:02}-T{j:02}" for i in range(1, 11) for j in range(1, 8)}:
            raise CoordError("Board task IDs are invalid.")
        active_owners = set()
        for aid, area in state["areas"].items():
            if not isinstance(area["completed"], bool):
                raise CoordError("Area completed flag must be boolean.")
            if area["owner"]:
                if not HANDLE.fullmatch(area["owner"]) or not HANDLE.fullmatch(area["agent"]):
                    raise CoordError("Invalid owner/session handle.")
                if not area["completed"]:
                    if area["owner"] in active_owners:
                        raise CoordError("One owner cannot hold multiple active areas.")
                    active_owners.add(area["owner"])
            elif area["agent"] or area["completed"]:
                raise CoordError("Unclaimed area cannot have a session or be complete.")
            unfinished = False
            for tid in area_tasks(state, aid):
                task = state["tasks"][tid]
                status = task["status"]
                if status not in STATUSES:
                    raise CoordError("Unknown task status.")
                if unfinished and status != "pending":
                    raise CoordError("Task order violated: later tasks must remain pending.")
                unfinished = unfinished or status != "done"
                if status == "done" and (not task["evidence"] or not task["reviewer"]):
                    raise CoordError("Done tasks require evidence and a reviewer.")
            if area["completed"] and unfinished:
                raise CoordError("Complete area has unfinished tasks.")
        if len(state["events"]) != state["revision"]:
            raise CoordError("Board revision/event history mismatch.")
        for i, event in enumerate(state["events"], 1):
            if event["revision"] != i:
                raise CoordError("Event revisions must be contiguous.")
    except (KeyError, TypeError, AttributeError) as exc:
        raise CoordError("Malformed board state.") from exc


def cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ").replace("\r", " ").replace("<", "&lt;").replace(">", "&gt;")


def render(state: dict) -> str:
    validate_state(state)
    lines = ["# Promise Keeper — team task board", "",
             "> Live authority: this file on the remote `coordination` branch. Other branches contain snapshots.",
             "> Run `python scripts/coord.py list` before selecting work. Offline snapshots do not grant ownership.", "",
             f"Revision: **{state['revision']}** · Updated (UTC): **{state['updatedAt']}**", "",
             "All application work starts pending. Blueprint/tooling completion does not complete application tasks.", "",
             "## Areas", "", "| Area | Scope | State | Owner | Agent | Next task | Latest checkpoint |",
             "| --- | --- | --- | --- | --- | --- | --- |"]
    for aid, a in sorted(state["areas"].items()):
        status = "complete" if a["completed"] else "claimed" if a["owner"] else "unclaimed"
        lines.append(f"| {aid} | [{cell(a['name'])}]({a['path']}) | {status} | {cell(a['owner']) or '—'} | {cell(a['agent']) or '—'} | {first_unfinished(state, aid) or 'all tasks done'} | {cell(a['checkpoint']) or '—'} |")
    lines += ["", "## Sequential tasks", "", "| Task | Description | State | Reviewer | Validation / evidence |",
              "| --- | --- | --- | --- | --- |"]
    for tid, task in sorted(state["tasks"].items()):
        lines.append(f"| {tid} | {cell(task['title'])} | {task['status']} | {cell(task['reviewer']) or '—'} | {cell(task['evidence']) or '—'} |")
    lines += ["", "## Coordination log", "", "| Revision | UTC | Actor | Action | Target | Message / evidence |",
              "| --- | --- | --- | --- | --- | --- |"]
    for e in state["events"]:
        lines.append("| " + " | ".join(cell(e[k]) for k in ("revision", "at", "actor", "action", "target", "message")) + " |")
    if not state["events"]:
        lines.append("| 0 | — | — | seed | all | No live claims yet. Initialize the remote board after pushing the blueprint. |")
    lines += ["", "## Machine state", "", "Generated by `scripts/coord.py`; do not edit tables or state manually.", "",
              "<details><summary>Canonical state used to generate this same Markdown file</summary>", "",
              "<!-- pk-state:start -->", "```json", json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True),
              "```", "<!-- pk-state:end -->", "", "</details>", ""]
    return "\n".join(lines)


def parse(content: str) -> dict:
    match = MARKER.search(content)
    if not match:
        raise CoordError("Board machine-state section missing.")
    try:
        state = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        raise CoordError("Invalid board JSON.") from exc
    validate_state(state)
    if render(state) != content:
        raise CoordError("Board tables differ from canonical state; review/repair instead of overwriting.")
    return state


def require_handle(value: str, label: str) -> None:
    if not HANDLE.fullmatch(value):
        raise CoordError(f"{label} must be 1–64 letters/digits/dot/underscore/hyphen, beginning with a letter/digit.")


def transition(original: dict, action: str, target: str, owner: str,
               agent: str = "", message: str = "", evidence: str = "", reviewer: str = "", to: str = "") -> dict:
    validate_state(original)
    require_handle(owner, "Owner")
    if any(len(v) > 2000 or any(ord(c) < 32 and c not in "\n\t" for c in v)
           for v in (message, evidence)):
        raise CoordError("Notes/evidence must be at most 2000 characters without control characters.")
    state = copy.deepcopy(original)
    aid = area_of(target)
    if aid not in state["areas"]:
        raise CoordError("Unknown area.")
    area = state["areas"][aid]
    if action in {"start", "review", "done", "block", "resume", "rework"}:
        if target not in state["tasks"]:
            raise CoordError("This command requires a task ID, for example A04-T01.")
    elif target != aid:
        raise CoordError("This command requires an area ID, for example A04.")
    if action == "claim":
        require_handle(agent, "Agent")
        if area["owner"] or area["completed"]:
            raise CoordError(f"{aid} is already owned or complete. No claim acquired.")
        if any(a["owner"] == owner and not a["completed"] for a in state["areas"].values()):
            raise CoordError("Owner already has an active area; complete/release it first.")
        area.update(owner=owner, agent=agent)
        message = message or f"Claimed by {owner}, session {agent}."
    else:
        if area["owner"] != owner:
            raise CoordError(f"{owner} does not own {aid}. No change made.")
        if area["completed"] and action != "note":
            raise CoordError("Area is complete; use a reviewed plan change for additional scope.")
        if action == "note":
            if not message.strip():
                raise CoordError("A checkpoint message is required.")
        elif action in {"release", "handoff"}:
            if not message.strip():
                raise CoordError("A precise handoff/checkpoint message is required.")
            if action == "release":
                area.update(owner="", agent="")
            else:
                require_handle(to, "Recipient")
                require_handle(agent, "Agent")
                if to == owner or any(a["owner"] == to and not a["completed"] for a in state["areas"].values()):
                    raise CoordError("Handoff recipient must differ and have no active area.")
                area.update(owner=to, agent=agent)
                message = f"Handoff to {to} ({agent}): {message}"
        elif action == "complete":
            if first_unfinished(state, aid):
                raise CoordError("All seven tasks must be done before completing an area.")
            require_handle(reviewer, "Reviewer")
            if reviewer == owner or not evidence.strip():
                raise CoordError("Completion needs a distinct real reviewer and merged/integration evidence.")
            area["completed"] = True
            message = f"Reviewer {reviewer}: {evidence}"
        else:
            if first_unfinished(state, aid) != target:
                raise CoordError("Only the first unfinished task may change state.")
            task = state["tasks"][target]
            allowed = {"start": ("pending", "in_progress"), "review": ("in_progress", "review"),
                       "done": ("review", "done"), "block": ("in_progress", "blocked"),
                       "resume": ("blocked", "in_progress"), "rework": ("review", "in_progress")}
            if action not in allowed or task["status"] != allowed[action][0]:
                raise CoordError(f"Invalid transition {action} from {task['status']}.")
            if action in {"block", "resume", "rework"} and not message.strip():
                raise CoordError("This transition needs a reason/checkpoint message.")
            if action in {"review", "done"}:
                if not evidence.strip():
                    raise CoordError("Review/completion evidence is required.")
                task["evidence"] = evidence
                message = evidence
            if action == "done":
                require_handle(reviewer, "Reviewer")
                if reviewer == owner:
                    raise CoordError("Reviewer must differ from the owner; do not invent a review.")
                task["reviewer"] = reviewer
                message = f"Reviewer {reviewer}: {evidence}"
            task["status"] = allowed[action][1]
            message = message or f"{target}: {task['status']}."
    state["revision"] += 1
    state["updatedAt"] = now()
    area["checkpoint"] = message
    state["events"].append({"revision": state["revision"], "at": state["updatedAt"], "actor": owner,
                            "action": action, "target": target, "message": message})
    validate_state(state)
    return state


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    try:
        result = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True,
                                encoding="utf-8", errors="replace", timeout=45, env=env)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise CoordError("Git unavailable or timed out. No ownership change is confirmed; refresh live state before retrying.") from exc
    if check and result.returncode:
        raise CoordError("Git operation failed. Check connectivity, Git authentication, branch existence and protection. No offline claim is granted.")
    return result


def remote_url(repo: Path, remote: str) -> str:
    found = git(repo, "remote", "get-url", remote, check=False)
    if found.returncode == 0:
        return found.stdout.strip()
    if Path(remote).is_absolute() and Path(remote).exists():
        return str(Path(remote).resolve())
    if remote.startswith(("https://", "ssh://", "git@")):
        return remote
    raise CoordError("Remote is not configured. Configure origin; use list --offline only for a snapshot.")


def prepare_temp(path: Path, url: str) -> None:
    git(path, "init", "-q")
    git(path, "remote", "add", "origin", url)


def fetch(path: Path, branch: str) -> str:
    git(path, "fetch", "--quiet", "--depth=1", "origin", f"refs/heads/{branch}")
    tip = git(path, "rev-parse", "FETCH_HEAD").stdout.strip()
    git(path, "checkout", "-q", "-B", "coord-working", "FETCH_HEAD")
    return tip


def save_commit(path: Path, state: dict, subject: str) -> None:
    (path / "TASKS.md").write_text(render(state), encoding="utf-8", newline="\n")
    git(path, "add", "--", "TASKS.md")
    git(path, "-c", "user.name=Promise Keeper Coordinator", "-c", "user.email=coordination@promise-keeper.invalid",
        "commit", "-q", "-m", subject)


def read_remote(repo: Path, remote: str) -> dict:
    url = remote_url(repo, remote)
    with tempfile.TemporaryDirectory(prefix="pk-board-") as tmp:
        path = Path(tmp)
        prepare_temp(path, url)
        fetch(path, BRANCH)
        return parse((path / "TASKS.md").read_text(encoding="utf-8"))


def mutate_remote(repo: Path, remote: str, update: Callable[[dict], dict], subject: str) -> dict:
    url = remote_url(repo, remote)
    with tempfile.TemporaryDirectory(prefix="pk-board-") as tmp:
        path = Path(tmp)
        prepare_temp(path, url)
        for _ in range(3):
            old_tip = fetch(path, BRANCH)
            current = parse((path / "TASKS.md").read_text(encoding="utf-8"))
            changed = update(current)  # Always revalidate ownership against the latest remote.
            save_commit(path, changed, subject)
            pushed = git(path, "push", "--quiet", "origin", f"HEAD:refs/heads/{BRANCH}", check=False)
            if pushed.returncode == 0:
                return changed
            new_tip = fetch(path, BRANCH)
            if new_tip == old_tip:
                raise CoordError("Push rejected without a concurrent board change. Check permissions/protection/connectivity. Refresh live state before retrying.")
        raise CoordError("Board changed repeatedly; no claim/update confirmed. Refresh live state and retry once stable.")


def initialize_remote(repo: Path, remote: str, base: str, owner: str) -> dict:
    require_handle(owner, "Owner")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./-]*", base) or ".." in base:
        raise CoordError("Invalid base branch.")
    url = remote_url(repo, remote)
    with tempfile.TemporaryDirectory(prefix="pk-board-") as tmp:
        path = Path(tmp)
        prepare_temp(path, url)
        existing = git(path, "ls-remote", "--exit-code", "origin", f"refs/heads/{BRANCH}", check=False)
        if existing.returncode != 2:
            if existing.returncode == 0:
                raise CoordError("Coordination branch already exists; use list. Initialization never replaces it.")
            raise CoordError("Could not verify remote board absence; initialization stopped.")
        fetch(path, base)
        state = parse((path / "TASKS.md").read_text(encoding="utf-8"))
        if state["revision"] != 0 or any(a["owner"] for a in state["areas"].values()):
            raise CoordError("Initialize from an unclaimed seed board only.")
        state["revision"] = 1
        state["updatedAt"] = now()
        state["events"].append({"revision": 1, "at": state["updatedAt"], "actor": owner,
                                "action": "initialize", "target": "all", "message": f"Live board initialized from {base}."})
        save_commit(path, state, "Initialize live Promise Keeper task board")
        pushed = git(path, "push", "--quiet", "origin", f"HEAD:refs/heads/{BRANCH}", check=False)
        if pushed.returncode:
            raise CoordError("Initialization push was not confirmed; run list before retrying. Another maintainer may have initialized it.")
        return state


def print_summary(state: dict, label: str) -> None:
    print(f"{label} | revision {state['revision']} | UTC {state['updatedAt']}")
    for aid, area in sorted(state["areas"].items()):
        task = first_unfinished(state, aid)
        status = "complete" if area["completed"] else "claimed" if area["owner"] else "UNCLAIMED"
        task_status = state["tasks"][task]["status"] if task else "all tasks done"
        print(f"{aid} {status:10} owner={area['owner'] or '-':16} next={task or '-'} ({task_status}) | {area['name']}")
        if area["checkpoint"]:
            print(f"  {area['checkpoint']}")
    print("Final integration dependencies and acceptance: docs/areas/. No offline snapshot grants a claim.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=ROOT)
    parser.add_argument("--remote", default="origin")
    sub = parser.add_subparsers(dest="command", required=True)
    listing = sub.add_parser("list")
    listing.add_argument("--offline", action="store_true")
    listing.add_argument("--json", action="store_true")
    sub.add_parser("sync")
    sub.add_parser("validate")
    init = sub.add_parser("init-remote")
    init.add_argument("--base", required=True)
    init.add_argument("--owner", required=True)
    for action in ("claim", "note", "start", "review", "done", "block", "resume", "rework", "release", "handoff", "complete"):
        p = sub.add_parser(action)
        p.add_argument("target")
        p.add_argument("--owner", required=True)
        p.add_argument("--agent", default="")
        p.add_argument("--message", default="")
        p.add_argument("--evidence", default="")
        p.add_argument("--reviewer", default="")
        p.add_argument("--to", default="")
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    try:
        if args.command == "validate":
            parse((repo / "TASKS.md").read_text(encoding="utf-8"))
            print("Local board syntax, rendering, task ordering and audit state valid (snapshot only).")
        elif args.command == "list":
            state = parse((repo / "TASKS.md").read_text(encoding="utf-8")) if args.offline else read_remote(repo, args.remote)
            label = "OFFLINE SNAPSHOT" if args.offline else "LIVE REMOTE BOARD"
            if args.json:
                print(json.dumps({"source": label, "state": state}, ensure_ascii=False, indent=2))
            else:
                print_summary(state, label)
        elif args.command == "sync":
            before = (repo / "TASKS.md").read_bytes()
            if git(repo, "status", "--porcelain", "--", "TASKS.md").stdout.strip():
                raise CoordError("Local TASKS.md has uncommitted changes; review/commit them before snapshot sync.")
            state = read_remote(repo, args.remote)
            if (repo / "TASKS.md").read_bytes() != before:
                raise CoordError("Local board changed during sync; refusing to overwrite it.")
            (repo / "TASKS.md").write_text(render(state), encoding="utf-8", newline="\n")
            print_summary(state, "REFRESHED LOCAL SNAPSHOT")
        elif args.command == "init-remote":
            print_summary(initialize_remote(repo, args.remote, args.base, args.owner), "LIVE BOARD INITIALIZED")
        else:
            state = mutate_remote(repo, args.remote,
                                  lambda s: transition(s, args.command, args.target, args.owner, args.agent,
                                                       args.message, args.evidence, args.reviewer, args.to),
                                  f"{args.command} {args.target} by {args.owner}")
            print_summary(state, "REMOTE UPDATE CONFIRMED")
        return 0
    except (CoordError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

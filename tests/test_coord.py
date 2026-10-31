from __future__ import annotations

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import coord
from check_repo import check_schema


class StateTests(unittest.TestCase):
    def setUp(self):
        self.state = coord.seed()

    def claim(self):
        return coord.transition(self.state, "claim", "A04", "alice", agent="agent-1")

    def test_seed_and_render_roundtrip(self):
        self.assertEqual(len(self.state["tasks"]), 70)
        self.assertEqual(coord.parse(coord.render(self.state)), self.state)

    def test_duplicate_claim_and_wrong_owner_rejected(self):
        state = self.claim()
        for action, target, owner in [("claim", "A04", "bob"), ("start", "A04-T01", "bob"), ("claim", "A05", "alice")]:
            with self.assertRaises(coord.CoordError):
                coord.transition(state, action, target, owner, agent="agent-2")

    def test_task_order_review_and_real_reviewer_required(self):
        state = self.claim()
        with self.assertRaises(coord.CoordError):
            coord.transition(state, "start", "A04-T02", "alice")
        state = coord.transition(state, "start", "A04-T01", "alice")
        with self.assertRaises(coord.CoordError):
            coord.transition(state, "done", "A04-T01", "alice", reviewer="bob", evidence="checks")
        state = coord.transition(state, "review", "A04-T01", "alice", evidence="PR 1; smoke pass")
        with self.assertRaises(coord.CoordError):
            coord.transition(state, "done", "A04-T01", "alice", reviewer="alice", evidence="checks")
        state = coord.transition(state, "done", "A04-T01", "alice", reviewer="bob", evidence="PR 1 reviewed")
        state = coord.transition(state, "start", "A04-T02", "alice")
        self.assertEqual(state["tasks"]["A04-T02"]["status"], "in_progress")

    def test_parallel_claim_requires_authorization_reason_and_separate_session(self):
        state = self.claim()
        for agent, message in [("agent-2", ""), ("agent-1", "User authorized two areas")]:
            with self.assertRaises(coord.CoordError):
                coord.transition(state, "claim", "A05", "alice", agent=agent, message=message, allow_parallel=True)
        state = coord.transition(state, "claim", "A05", "alice", agent="agent-2",
                                 message="User explicitly authorized keeping both areas", allow_parallel=True)
        self.assertEqual(coord.parse(coord.render(state)), state)
        self.assertEqual(state["areas"]["A04"]["owner"], "alice")
        self.assertEqual(state["areas"]["A05"]["owner"], "alice")
        self.assertIn("Parallel ownership authorized", state["events"][-1]["message"])

    def test_block_resume_rework_and_checkpoint_escaping(self):
        state = coord.transition(self.claim(), "start", "A04-T01", "alice")
        state = coord.transition(state, "block", "A04-T01", "alice", message="Await CR | pending\n<safe>")
        self.assertEqual(coord.parse(coord.render(state)), state)
        with self.assertRaises(coord.CoordError):
            coord.transition(state, "start", "A04-T02", "alice")
        state = coord.transition(state, "resume", "A04-T01", "alice", message="CR merged")
        state = coord.transition(state, "review", "A04-T01", "alice", evidence="PR 1")
        state = coord.transition(state, "rework", "A04-T01", "alice", message="Review feedback")
        self.assertEqual(state["tasks"]["A04-T01"]["status"], "in_progress")

    def test_handoff_and_release_preserve_progress(self):
        state = coord.transition(self.claim(), "start", "A04-T01", "alice")
        state = coord.transition(state, "handoff", "A04", "alice", agent="agent-2", to="bob", message="PR 2; next verify")
        self.assertEqual(state["areas"]["A04"]["owner"], "bob")
        state = coord.transition(state, "release", "A04", "bob", message="PR 2 pushed; resume T01")
        state = coord.transition(state, "claim", "A04", "carol", agent="agent-3")
        self.assertEqual(state["tasks"]["A04-T01"]["status"], "in_progress")

    def test_complete_requires_all_tasks_and_review(self):
        state = self.claim()
        with self.assertRaises(coord.CoordError):
            coord.transition(state, "complete", "A04", "alice", reviewer="bob", evidence="not yet")
        for i in range(1, 8):
            task = f"A04-T{i:02}"
            state = coord.transition(state, "start", task, "alice")
            state = coord.transition(state, "review", task, "alice", evidence=f"PR {i}; checks")
            state = coord.transition(state, "done", task, "alice", reviewer="bob", evidence=f"PR {i} reviewed")
        state = coord.transition(state, "complete", "A04", "alice", reviewer="bob", evidence="Merged; J01 J03 pass")
        self.assertTrue(state["areas"]["A04"]["completed"])
        state = coord.transition(state, "claim", "A05", "alice", agent="next-session")
        self.assertEqual(state["areas"]["A05"]["owner"], "alice")

    def test_tampered_table_and_audit_rejected(self):
        text = coord.render(self.state).replace("| A04 |", "| WRONG |", 1)
        with self.assertRaises(coord.CoordError):
            coord.parse(text)
        state = copy.deepcopy(self.state)
        state["revision"] = 1
        with self.assertRaises(coord.CoordError):
            coord.validate_state(state)

    def test_extraction_fixture_and_invalid_money(self):
        schema = json.loads((coord.ROOT / "contracts/extraction.schema.json").read_text())
        value = json.loads((coord.ROOT / "fixtures/scenario.json").read_text())["extraction"]
        check_schema(value, schema, schema)
        value["candidates"][0]["money"]["minor"] = 199.50
        with self.assertRaises(ValueError):
            check_schema(value, schema, schema)


class GitRemoteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="pk-test-")
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.remote = self.base / "remote.git"
        self.remote.mkdir()
        coord.git(self.remote, "init", "--bare", "-q")
        self.repo = self.base / "client"
        self.repo.mkdir()
        coord.git(self.repo, "init", "-q")
        coord.git(self.repo, "checkout", "-q", "-b", "main")
        coord.git(self.repo, "remote", "add", "origin", str(self.remote))
        coord.save_commit(self.repo, coord.seed(), "Seed")
        coord.git(self.repo, "push", "-q", "origin", "HEAD:refs/heads/main")
        coord.initialize_remote(self.repo, "origin", "main", "maintainer")

    def test_initialize_once_remote_update_and_feature_untouched(self):
        with self.assertRaises(coord.CoordError):
            coord.initialize_remote(self.repo, "origin", "main", "maintainer")
        before = coord.git(self.repo, "rev-parse", "HEAD").stdout
        result = coord.mutate_remote(self.repo, "origin", lambda s: coord.transition(s, "claim", "A03", "alice", agent="agent-1"), "Claim")
        self.assertEqual(result["areas"]["A03"]["owner"], "alice")
        self.assertEqual(coord.read_remote(self.repo, "origin"), result)
        self.assertEqual(coord.git(self.repo, "rev-parse", "HEAD").stdout, before)
        self.assertEqual(coord.parse((self.repo / "TASKS.md").read_text(encoding="utf-8"))["revision"], 0)

    def test_two_simultaneous_claims_have_one_winner(self):
        barrier = threading.Barrier(2)
        outcomes = []

        def claimant(owner):
            def update(state):
                changed = coord.transition(state, "claim", "A04", owner, agent=f"{owner}-agent")
                barrier.wait(timeout=20)
                return changed
            try:
                coord.mutate_remote(self.repo, "origin", update, f"Claim {owner}")
                outcomes.append((owner, "won"))
            except coord.CoordError:
                outcomes.append((owner, "lost"))
            except Exception as exc:
                outcomes.append((owner, f"ERROR {exc}"))

        threads = [threading.Thread(target=claimant, args=(owner,)) for owner in ("alice", "bob")]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=60)
        self.assertFalse(any(thread.is_alive() for thread in threads))
        self.assertEqual(sorted(result for _, result in outcomes), ["lost", "won"])
        live = coord.read_remote(self.repo, "origin")
        winner = next(owner for owner, result in outcomes if result == "won")
        self.assertEqual(live["areas"]["A04"]["owner"], winner)
        self.assertEqual(live["revision"], 2)

    def test_unrelated_concurrent_updates_retry_without_lost_events(self):
        barrier = threading.Barrier(2)
        errors = []

        def claimant(owner, area):
            first = True
            def update(state):
                nonlocal first
                changed = coord.transition(state, "claim", area, owner, agent=f"{owner}-agent")
                if first:
                    first = False
                    barrier.wait(timeout=20)
                return changed
            try:
                coord.mutate_remote(self.repo, "origin", update, f"Claim {owner}")
            except Exception as exc:
                errors.append(str(exc))

        threads = [threading.Thread(target=claimant, args=pair) for pair in (("alice", "A03"), ("bob", "A04"))]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=60)
        self.assertFalse(any(thread.is_alive() for thread in threads))
        self.assertEqual(errors, [])
        live = coord.read_remote(self.repo, "origin")
        self.assertEqual(live["revision"], 3)
        self.assertEqual(live["areas"]["A03"]["owner"], "alice")
        self.assertEqual(live["areas"]["A04"]["owner"], "bob")

    def test_unavailable_remote_fails_without_local_claim(self):
        before = (self.repo / "TASKS.md").read_bytes()
        coord.git(self.repo, "remote", "set-url", "origin", str(self.base / "missing.git"))
        with self.assertRaises(coord.CoordError):
            coord.mutate_remote(self.repo, "origin", lambda s: coord.transition(s, "claim", "A01", "alice", agent="agent"), "Claim")
        self.assertEqual((self.repo / "TASKS.md").read_bytes(), before)

    def test_dirty_snapshot_sync_refuses_overwrite(self):
        before = (self.repo / "TASKS.md").read_text(encoding="utf-8")
        (self.repo / "TASKS.md").write_text(before + "\nLocal edit\n", encoding="utf-8")
        self.assertEqual(coord.main(["--repo", str(self.repo), "sync"]), 1)
        self.assertTrue((self.repo / "TASKS.md").read_text(encoding="utf-8").endswith("Local edit\n"))


if __name__ == "__main__":
    unittest.main()

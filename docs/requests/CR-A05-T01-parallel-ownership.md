# CR-A05-T01-parallel-ownership

- State: accepted by explicit project-owner instruction; implementation review pending
- Requesting owner / area: tushar / A05
- Shared files: scripts/coord.py, tests/test_coord.py, docs/WORKFLOW.md
- Authorization: Tushar confirmed “IM TUSHAR I AM DOING 2 AREAS RN” in the A05 chat on 31 October 2026.
- Change: preserve A01 ownership and permit A05 under the same human, a different agent session, and a separate working tree. Additional claims require an explicit flag plus a recorded authorization reason.
- Compatibility: board schema/render unchanged; existing old validators reject repeated owners. All active agents need the updated coordinator before their next board command. No task states, reviewers, or other owners are changed by this patch.
- Validation: coordinator state and real local Git race suite, including explicit authorization and distinct-session checks.
- Review: pending; do not invent reviewer approval.

# Operational runbook requirements

A10-T04/T05 creates tested runbooks here. This index is a task specification, not proof that operations have been implemented.

Required runbooks: fresh self-host install; production release/migrations; rollback/forward repair; worker outage; provider outage/quota; expired mail watch or delta/history gap; token/key rotation/revocation; quarantined/corrupt evidence; stuck/dead-letter job; export/purge failure; data restore with deletion tombstones; incident response with sanitized user communication; model/prompt rollback and reevaluation.

Each runbook needs trigger/symptom, scope/impact, safe diagnostics, authorized actions, exact tested commands, rollback, verification, owner and last rehearsal evidence. Never put credentials or actual user evidence in commands/examples. Separate operational retries from resending an external action; replays must remain idempotent.

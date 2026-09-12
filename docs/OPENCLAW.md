# OpenClaw adapter

The fork supports `--input tasks.json --runner openclaw --agent ID`. Existing Codex and Claude Code local discovery remain available when `--input` is omitted. OpenClaw skill users must supply an explicit authorized bundle.

```json
{"tasks":[{"id":"example-1","complete":false,"events":[
  {"id":"m1","kind":"user","ts":"2026-09-12T10:00:00Z","text":"Prepare a preview; do not publish.","ref":"authorized-source:1"},
  {"id":"t1","kind":"tool","name":"preview","callId":"c1","text":"Preview requested"},
  {"id":"r1","kind":"tool_result","callId":"c1","status":"result_observed","text":"Preview generated","ref":"authorized-source:3"}
]}]}
```

Accepted kinds: user, assistant, assistant_send_attempt, tool, tool_result. Events must be chronological; IDs deduplicate within a task. System/developer records are excluded. Preserve quoted user context in text when relevant, clearly marked as a quote. `complete` means the evidence bundle covers the task, not that the task succeeded.

Tool results must link to callId. Status is `result_observed` (a verified successful tool result, not business success), `failure_observed`, `pending`, or `unknown`. A response envelope alone does not establish success. Unlinked or unclassified results remain unknown. Missing git/interrupt measurements remain null. Nested calls must be normalized consistently; do not count both a wrapper and its nested calls as separate business failures.

The runner uses a fresh conversation and explicit model; the selected agent bootstrap remains. No `--deliver` is used. Tool-free prompting is not an access control; successful tool calls invalidate the analysis after execution. Use an agent whose existing permissions are appropriate for the data. No credentials are copied. Prompts are temporary mode-0600 files, cleaned after execution; OpenClaw retains its normal session records.

## Package the skill

From this repository run `node scripts/build-skill.mjs /absolute/staging/agents-deep-insights`, then install that staging directory using the environment's managed skill installer. The bundle includes runtime source, package metadata and license, with no local histories or dependencies to fetch. Build into a new directory, outside this repository. Repository edits are source development; live skill publication follows the environment's managed policy.

Generated reports/caches can contain private business evidence. Keep them out of public repositories. Inspect scope, failed labels and receipts before reporting completion. `doctor` currently diagnoses the original local Codex/Claude sources, not Gateway authentication; use a small authorized Gateway run for end-to-end verification.

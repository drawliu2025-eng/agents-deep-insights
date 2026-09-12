---
name: agents-deep-insights
description: Review historical AI-assisted tasks for repeated friction and evidence-grounded improvement candidates. Use for retrospective collaboration analysis, not live task status or automatic instruction rewriting.
---

# Agents Deep Insights

Produce a review grounded in the requested historical scope, with traceable findings and explicit coverage. Do not change instructions or send reports elsewhere merely because analysis suggests improvements.

For OpenClaw, read [references/openclaw.md](references/openclaw.md). Gather only the authorized tasks through supported history/recall tools. Build an explicit task bundle; do not automatically scan all agents or interpret runtime envelopes as user requests. Preserve original user corrections, tool results, task boundaries and source references. Missing results stay unknown.

Run the bundled CLI with Node 18+:

```sh
node <skill-directory>/runtime/src/cli.mjs stats --input <bundle.json> --days 0
node <skill-directory>/runtime/src/cli.mjs run --input <bundle.json> --runner openclaw --agent <current-authorized-agent> --model gpt-6-astra --days 0 --no-open --no-english --out <private-report.html>
```

`stats` is local. `run` sends redacted evidence to the configured model; redaction is best effort. Use the current authorized agent, not another identity. The Gateway runner validates JSON locally and verifies the model receipt; it is not provider-enforced strict output or a bootstrap-free sandbox.

Review the generated facets against original evidence before presenting causal claims. Model labels are observations, not objective incident counts. Distinguish prepared, executed, verified and delivered. Normal iteration or unexplained interruption does not establish user fault. Proposed rule changes require their own authorized maintenance route; this skill only produces candidates.

Deliver the requested review with scope, supported findings, remaining gaps and artifact links. Do not equate a successful process exit with complete coverage; inspect failed-label counts and narrative availability in the artifacts.

# Astra-oriented fork

Based on the OpenAI article [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).

Changes: narrower skill discovery, conditional reference loading, outcome-oriented labeling and synthesis without fixed prose quotas; preserve evidence/causality boundaries and deterministic statistics. The model default is gpt-6-astra; callers can override it without changing global agent configuration.

OpenClaw integration uses explicit task evidence, source references, null unknown measurements, prompt/schema/model/runner-aware cache keys, local schema validation and route receipts. The original provider paths remain. These changes do not establish a measured quality or latency improvement; evaluate against representative source tasks before trusting conclusions. See OPENCLAW.md for packaging and limitations.

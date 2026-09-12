import { readFileSync } from 'node:fs';
import { redact } from '../redact.mjs';

const KINDS = new Set(['user', 'assistant', 'assistant_send_attempt', 'tool', 'tool_result']);
export function readTaskBundle(file) {
  const input = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(input.tasks) || !input.tasks.length) throw Error('Expected nonempty tasks[] in an explicitly scoped evidence bundle');
  const ids = new Set();
  return input.tasks.map(task => {
    if (!task.id || typeof task.id !== 'string' || ids.has(task.id)) throw Error('Task IDs must be unique strings');
    ids.add(task.id);
    if (!Array.isArray(task.events)) throw Error('Task events[] required');
    const seen = new Set();
    const events = task.events.filter(e => {
      if (!KINDS.has(e.kind)) return false;
      if (typeof e.text !== 'string') throw Error('Event text must be a string');
      if (e.id) { if (seen.has(e.id)) return false; seen.add(e.id); }
      return true;
    });
    const stamps = events.map(e => Date.parse(e.ts)).filter(Number.isFinite);
    const calls = events.filter(e => e.kind === 'tool');
    const callIds = new Set(calls.map(e => e.callId).filter(Boolean));
    const results = new Map();
    for (const e of events) if (e.kind === 'tool_result' && e.callId && callIds.has(e.callId)) results.set(e.callId, e.status);
    const statuses = calls.map(e => results.get(e.callId) || 'unknown');
    const known = statuses.filter(s => s === 'failure_observed' || s === 'result_observed').length;
    const pending = statuses.filter(s => s === 'pending').length;
    return { id: task.id, provider: 'task-bundle', source: 'explicit-task', explicitTask: true,
      startedAt: stamps.length ? Math.min(...stamps) : null,
      durationMinutes: stamps.length > 1 ? (Math.max(...stamps) - Math.min(...stamps)) / 60000 : 0,
      userMessages: events.filter(e => e.kind === 'user').length,
      assistantMessages: events.filter(e => e.kind === 'assistant' || e.kind === 'assistant_send_attempt').length,
      toolCalls: calls.length, toolFailures: statuses.filter(s => s === 'failure_observed').length,
      toolOutcomesKnown: known, toolStillRunning: pending, toolOutcomeUnknown: calls.length - known - pending,
      toolCounts: calls.reduce((o,e) => { const k = e.name || 'unknown'; o[k] = (o[k] || 0) + 1; return o; }, {}),
      userInterruptions: null, gitCommits: null, gitPushes: null,
      transcriptComplete: task.complete === true,
      transcript: events.map((e,i) => '[E' + (i+1) + ' ' + e.kind + '] ' + redact(e.text)
        + (e.ref ? ' (source: ' + redact(String(e.ref)) + ')' : '')),
    };
  });
}

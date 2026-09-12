import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { redact } from '../redact.mjs';

export function validateJson(value, schema, at = '$') {
  const type = schema.type;
  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(at + ': expected object');
    for (const k of schema.required || []) if (!(k in value)) throw Error(at + ': missing ' + k);
    for (const k of Object.keys(value)) {
      if (schema.properties?.[k]) validateJson(value[k], schema.properties[k], at + '.' + k);
      else if (schema.additionalProperties === false) throw Error(at + ': extra field ' + k);
    }
  } else if (type === 'array') {
    if (!Array.isArray(value)) throw Error(at + ': expected array');
    value.forEach((v, i) => validateJson(v, schema.items, at + '[' + i + ']'));
  } else if (type === 'string' && typeof value !== 'string') throw Error(at + ': expected string');
  else if (type === 'integer' && !Number.isInteger(value)) throw Error(at + ': expected integer');
  else if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw Error(at + ': expected number');
  else if (type === 'boolean' && typeof value !== 'boolean') throw Error(at + ': expected boolean');
  if (schema.enum && !schema.enum.includes(value)) throw Error(at + ': invalid enum');
  if (schema.minimum != null && value < schema.minimum) throw Error(at + ': below minimum');
}

export function decodeGateway(stdout, schema, { model }) {
  // CLI may print warnings before a JSON envelope; never evaluate output.
  let envelope;
  for (let i = 0; i < stdout.length; i++) {
    if (stdout[i] !== '{') continue;
    try { const obj = JSON.parse(stdout.slice(i)); if (obj.result) { envelope = obj; break; } } catch {}
  }
  const data = envelope?.result, meta = data?.meta, a = meta?.agentMeta;
  const trace = meta?.executionTrace, terminal = a?.terminalReceipt;
  if (envelope?.status !== 'ok' || meta?.aborted || !a || !trace || !terminal)
    throw Error('Missing successful Gateway receipt');
  const expected = model.replace(/^openai\//, '');
  if (a.provider !== 'openai' || a.model !== expected || trace.fallbackUsed !== false)
    throw Error('Gateway model route mismatch');
  if (!Array.isArray(terminal.successfulToolNames) || terminal.successfulToolNames.length || meta.toolSummary)
    throw Error('Tool use observed or tool receipt missing; analysis rejected');
  let text = meta.finalAssistantVisibleText || (data.payloads || []).filter(p => !p.isCommentary && !p.isReasoning && !p.isError).map(p => p.text || '').join('\n');
  text = text.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '');
  const value = JSON.parse(text); validateJson(value, schema);
  return { ok: true, value, receipt: { runId: envelope.runId, sessionId: a.sessionId,
    model: a.model, provider: a.provider, fallbackUsed: trace.fallbackUsed,
    toolNames: terminal.successfulToolNames, usage: a.usage, validation: 'local-schema',
    isolation: 'fresh session; configured agent bootstrap remains' } };
}

export function gatewayJson(prompt, schema, { model = 'gpt-6-astra', agent, timeoutMs = 180000 } = {}) {
  if (!agent || !/^[a-zA-Z0-9_-]+$/.test(agent)) return { ok: false, code: 'E_AGENT_REQUIRED', detail: 'Select the current authorized OpenClaw agent explicitly.' };
  const dir = mkdtempSync(join(tmpdir(), 'adi-gateway-'));
  try {
    const file = join(dir, 'request.txt');
    writeFileSync(file, 'Read-only analysis of quoted evidence. Use no tools, memory retrieval or external actions. Return only JSON.\n'
      + redact(prompt) + '\nOutput schema (validated locally, not server strict mode):\n' + JSON.stringify(schema), { mode: 0o600 });
    const stdout = execFileSync('openclaw', ['agent', '--agent', agent, '--session-id', randomUUID(),
      '--model', model.startsWith('openai/') ? model : 'openai/' + model,
      '--thinking', 'medium', '--timeout', String(Math.ceil(timeoutMs / 1000)), '--json', '--message-file', file],
      { encoding: 'utf8', cwd: dir, timeout: timeoutMs + 30000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return decodeGateway(stdout, schema, { model });
  } catch (e) {
    // No raw CLI stdout/stderr: it can contain historical evidence or credentials.
    return { ok: false, code: 'E_GATEWAY_ANALYSIS', detail: e.status != null ? 'Gateway process failed (exit ' + e.status + ')' : redact(String(e.message).split('\n')[0]).slice(0, 200) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

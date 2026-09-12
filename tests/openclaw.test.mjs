import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { decodeGateway } from '../src/pipeline/gateway.mjs';
import { readTaskBundle } from '../src/providers/task-bundle.mjs';
import { aggregateMetas } from '../src/pipeline/aggregate.mjs';
import { prepareTranscript, labelFingerprint } from '../src/pipeline/label.mjs';
import { isSubstantive } from '../src/pipeline/sample.mjs';
const schema = { type:'object', additionalProperties:false, required:['answer'], properties:{answer:{type:'integer',minimum:0}} };
const envelope = () => ({status:'ok',runId:'r',result:{meta:{finalAssistantVisibleText:'{"answer":1}',agentMeta:{provider:'openai',model:'gpt-6-astra',terminalReceipt:{successfulToolNames:[]}},executionTrace:{fallbackUsed:false}}}});
test('Gateway accepts valid receipts and rejects fallback, tools and invalid schema', () => {
  const run = e => decodeGateway(JSON.stringify(e), schema, {model:'gpt-6-astra'});
  assert.equal(run(envelope()).value.answer,1);
  for (const mutate of [e=>e.result.meta.executionTrace.fallbackUsed=true,e=>e.result.meta.agentMeta.terminalReceipt.successfulToolNames.push('send'),e=>e.result.meta.finalAssistantVisibleText='{"answer":-1}',e=>e.result.meta.agentMeta.model='other',e=>delete e.result.meta.agentMeta.terminalReceipt]) {
    const e=envelope();mutate(e);assert.throws(()=>run(e));
  }
});
test('Explicit tasks deduplicate events, ignore system text and preserve unknown measurements', () => {
  const dir=mkdtempSync(join(tmpdir(),'adi-test-'));try {
    const file=join(dir,'bundle.json');writeFileSync(file,JSON.stringify({tasks:[{id:'t',events:[{id:'u',kind:'user',text:'Make a preview'},{id:'u',kind:'user',text:'duplicate'},{kind:'system',text:'not a request'},{kind:'tool',callId:'a',text:'attempt'},{kind:'tool_result',callId:'a',status:'pending',text:'still running'}]}]}));
    const m=readTaskBundle(file)[0];assert.equal(m.userMessages,1);assert.equal(m.toolStillRunning,1);assert.equal(m.toolOutcomesKnown,0);assert.equal(m.transcript.length,3);assert.equal(m.gitCommits,null);assert.equal(isSubstantive(m),true);
    const a=aggregateMetas([m]);assert.equal(a.failureRate,null);assert.equal(a.gitCommits,null);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Compression retains a complete mid-task user correction and cache distinguishes model routes', () => {
  const lines=['[E1 tool] '+'x'.repeat(20000),'[E2 user] Preview only; never publish.','[E3 tool_result] '+'y'.repeat(20000)];
  assert.ok(prepareTranscript(lines,5000).includes(lines[1]));
  const m={transcript:lines};assert.notEqual(labelFingerprint(m,{runner:'codex'}),labelFingerprint(m,{runner:'openclaw',agent:'main'}));
  assert.notEqual(labelFingerprint(m,{model:'gpt-6-astra'}),labelFingerprint(m,{model:'other'}));
});

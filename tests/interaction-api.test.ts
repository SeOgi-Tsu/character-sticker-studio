import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createApp } from '../server/app.ts';
import sharp from 'sharp';

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'sticker-interaction-'));
  const runtime = createApp({ dataDir: directory, autoStart: false });
  const server = runtime.app.listen(0, '127.0.0.1');
  await new Promise<void>(done => server.once('listening', done));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const call = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  return { call, async close() { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await runtime.close(); assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep)); await rm(directory, { recursive: true, force: true }); } };
}

test('viewer interaction, intensity and intent survive save, recipe export and import', async () => {
  const f = await setup();
  try {
    const project = (await f.call('/api/bootstrap')).data.projects[0];
    const fields = { interactionId: 'offer', intensity: 3, intent: '让对方忍不住伸手接住这份礼物。' };
    const saved = await f.call(`/api/projects/${project.id}`, 'PUT', { ...project, overrides: { waao: fields } });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.data.overrides.waao, fields);
    const recipe = (await f.call(`/api/projects/${project.id}/recipe`)).data;
    const imported = await f.call('/api/projects/import', 'POST', recipe);
    assert.equal(imported.status, 201);
    assert.deepEqual(imported.data.overrides.waao, fields);
    const oldCustom = { id: 'legacy-custom', name: '旧表情', caption: '嗯', category: '自定义', action: 'Wave gently.', tags: [], emoji: '' };
    const legacy = await f.call('/api/projects', 'POST', { customReactions: [oldCustom], selectedIds: [oldCustom.id] });
    assert.equal(legacy.status, 201);
    assert.equal(legacy.data.customReactions[0].interactionId, undefined);
  } finally { await f.close(); }
});

test('invalid interaction controls are rejected without changing the stored recipe', async () => {
  const f = await setup();
  try {
    const project = (await f.call('/api/bootstrap')).data.projects[0];
    for (const invalid of [{ interactionId: 'not-a-mode' }, { interactionId: null }, ...[0, 4, 2.5, '3', null].map(intensity => ({ intensity })), { intent: 'x'.repeat(161) }]) {
      const response = await f.call(`/api/projects/${project.id}`, 'PUT', { ...project, overrides: { waao: invalid } });
      assert.equal(response.status, 400, JSON.stringify(invalid));
    }
    const stored = (await f.call('/api/bootstrap')).data.projects.find((p: { id: string }) => p.id === project.id);
    assert.deepEqual(stored.overrides, project.overrides);
  } finally { await f.close(); }
});

test('imported interaction sample keeps the full production prompt for reproducibility', async () => {
  const f=await setup();
  try {
    const project=(await f.call('/api/bootstrap')).data.projects[0];
    const pixels=await sharp({create:{width:8,height:8,channels:3,background:'#ffffff'}}).png().toBuffer();
    const asset=(await f.call('/api/assets','POST',{filename:'sample.png',dataUrl:'data:image/png;base64,'+pixels.toString('base64')})).data;
    const provenance='Production interaction prompt. '.repeat(200)+'Keep this final action detail.';
    const result=await f.call('/api/jobs/import','POST',{projectId:project.id,assetId:asset.id,kind:'sticker',reactionId:'hug-lunge',name:'互动样张',provenance});
    assert.equal(result.status,201);
    assert.equal(result.data.prompt,provenance);
  } finally { await f.close(); }
});

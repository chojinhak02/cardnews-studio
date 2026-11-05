import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');
new vm.Script(js);

const ids = new Set([...html.matchAll(/id="([\w-]+)"/g)].map(match => match[1]));
const usedIds = [...js.matchAll(/\$\('#([\w-]+)'\)/g)].map(match => match[1]);
for (const id of usedIds) assert(ids.has(id), `Missing HTML element: ${id}`);

const context = { localStorage: { getItem: () => null }, structuredClone };
vm.createContext(context);
vm.runInContext(js.slice(0, js.indexOf('function safeArchive')) + ';globalThis.cards = makeCards(example);', context);
assert.equal(context.cards.length, 6);
assert(context.cards.every(card => card.title && card.body && !card.body.includes('[')));
assert.deepEqual(context.cards.slice(2, 5).map(card => card.title).join(','), '교통,생활,계약');
vm.runInContext('globalThis.original = originalSample; globalThis.current = state.cards;', context);
assert.equal(context.original.length, 6);
assert.equal(context.current[0].title, '하루를 바꾸는\n작은 습관');

assert.equal((js.match(/localStorage\.setItem/g) || []).length, 1, 'Only the explicit archive writer may persist data');
const legacyRaw = JSON.stringify({ topic: '이전 주제', cards: Array.from({ length: 6 }, (_, i) => ({ title: `이전 제목 ${i + 1}`, body: `이전 본문 ${i + 1}` })), selected: 3, theme: 'bold', color: '#445a98' });
const recoveryContext = { localStorage: { getItem: key => key === 'cardstudio-project-v1' ? legacyRaw : null }, structuredClone };
vm.createContext(recoveryContext);
vm.runInContext(js.slice(0, js.indexOf('function safeArchive')) + ';globalThis.recovered = state.cards;', recoveryContext);
assert.equal(recoveryContext.recovered[3].body, '이전 본문 4');
console.log('검증 통과: 원래 카드 6장 표시, 기존 저장 카드 복원, 명시적 저장 경로');

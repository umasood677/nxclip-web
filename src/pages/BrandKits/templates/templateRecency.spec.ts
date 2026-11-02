import {test} from 'node:test';import assert from 'node:assert/strict';import {templateRecency} from './templateRecency';
test('drafts and saved templates share newest-first ordering regardless of saved state',()=>{
 const result=templateRecency([{id:'old',saved:true,updatedAt:'2026-11-01',provenance:{}},{id:'new',saved:false,updatedAt:'2026-11-03',provenance:{}}] as never,[{id:'draft',updatedAt:'2026-11-02'}] as never);
 assert.deepEqual(result.map(e=>e.kind==='template'?e.record.id:e.draft.id),['new','draft','old']);
});
test('missing legacy timestamps preserve input order without inventing dates',()=>{assert.deepEqual(templateRecency([{id:'a'},{id:'b'}] as never,[]).map(e=>e.kind==='template'?e.record.id:''),['a','b']);});

import assert from 'node:assert/strict';
import { normalizeSkillIds, snapshotSkillIds } from '../supabase/functions/_shared/pure/skill-snapshot.ts';

let checks = 0;
const equal = (a: unknown, b: unknown) => { assert.deepEqual(a, b); checks++; };

equal(normalizeSkillIds(['a', 'a', '', 3, ' b ']), ['a', 'b']);
equal(snapshotSkillIds({ requested: [], botSkillIds: ['s1', 's2', 's3'], eligibleIds: ['s1', 's3'], botBound: true }), ['s1', 's3']);
equal(snapshotSkillIds({ requested: ['s3', 's1'], botSkillIds: ['s1', 's2', 's3'], eligibleIds: ['s1', 's3'], botBound: true }), ['s1', 's3']);
equal(snapshotSkillIds({ requested: ['s3', 's9'], botSkillIds: ['s1', 's2', 's3'], eligibleIds: ['s1', 's3', 's9'], botBound: true }), ['s3']);
equal(snapshotSkillIds({ requested: ['s9'], botSkillIds: [], eligibleIds: ['s9'], botBound: true }), []);
equal(snapshotSkillIds({ requested: ['s1', 's2'], eligibleIds: ['s2'] }), ['s2']);

console.log(`skill snapshot contract: ${checks} assertions passed`);

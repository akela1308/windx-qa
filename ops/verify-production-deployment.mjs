// Read only: inspect precisely the submitted deployment, never just the latest one.
import assert from 'node:assert/strict';
const id = process.argv[2];
assert.match(id ?? '', /^[a-f0-9-]{36}$/);
let input = '';
for await (const chunk of process.stdin) input += chunk;
const row = JSON.parse(input).find(item => item.id === id);
assert.ok(row, 'Requested production deployment must exist');
assert.equal(row.status, 'SUCCESS', 'Requested deployment must have succeeded');
console.log(JSON.stringify({verified:true, deploymentId:row.id, status:row.status}, null, 2));

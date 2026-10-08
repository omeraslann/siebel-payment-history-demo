import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from '../src/server.js';
import { queryPayments } from '../src/adapter.js';
import { mapPage, fields } from '../src/mapping.js';
import { payments } from '../src/data.js';

async function fixture(t, { timeoutMs = 2000, slowMs = 3000 } = {}) {
  const logs = [];
  // Ordinary tests need CI scheduling headroom; timeout behavior has its own fixture.
  const server = createDemoServer({ timeoutMs, slowMs, log: row => logs.push(row) });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.close(); server.closeAllConnections(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function get(path, options) {
    const response = await fetch(base + path, options);
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  return { get, logs };
}
const path = '/vbc/customers/CUST-1001/payments';
const query = { customerId: 'CUST-1001', page: 1, pageSize: 2, scenario: 'normal' };

test('health endpoint identifies the mock', async t => {
  const { get } = await fixture(t);
  assert.deepEqual((await get('/health')).body, { status: 'ok', demo: true });
});
test('Init returns exactly the supported mock fields', async t => {
  const { get } = await fixture(t);
  assert.deepEqual(Object.keys((await get('/vbc/init')).body.properties), fields);
});
test('Query performs HTTP fetch, maps two rows and uses decimal strings', async t => {
  const { get, logs } = await fixture(t);
  const result = await get(path);
  assert.equal(result.status, 200);
  assert.equal(result.body.type, 'MockPropertySet');
  assert.equal(result.body.children.length, 2);
  assert.deepEqual(result.body.children[0].properties, {
    'External Payment Id': 'PAY-003', 'Customer External Id': 'CUST-1001',
    'Payment Date': '2026-09-23', Amount: '1299.50', Currency: 'TRY',
    'Payment Status': 'Completed', 'Masked Account': '****0042'
  });
  assert.equal(result.body.properties.HasMore, 'true');
  assert.ok(logs.some(row => row.route === 'mock-provider'));
});
test('second page has the last row and no continuation', async t => {
  const { get } = await fixture(t);
  const { body } = await get(path + '?page=2');
  assert.equal(body.children.length, 1);
  assert.equal(body.children[0].properties['External Payment Id'], 'PAY-001');
  assert.equal(body.properties.HasMore, 'false');
});
test('page after last page is an empty successful result', async t => {
  const { get } = await fixture(t);
  const result = await get(path + '?page=3');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.children, []);
  assert.equal(result.body.properties.Total, '3');
});
test('known customer without history differs from a missing customer', async t => {
  const { get } = await fixture(t);
  const empty = await get('/vbc/customers/CUST-1003/payments');
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.children, []);
  const missing = await get('/vbc/customers/CUST-9999/payments');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'CUSTOMER_NOT_FOUND');
});
test('only the selected customer is returned', async t => {
  const { get } = await fixture(t);
  const result = await get('/vbc/customers/CUST-1002/payments');
  assert.equal(result.body.children.length, 1);
  assert.equal(result.body.children[0].properties['Customer External Id'], 'CUST-1002');
});
test('provider service exposes masked identifiers only', async t => {
  const { get } = await fixture(t);
  const result = await get('/api/customers/CUST-1001/payments');
  assert.match(result.body.items[0].accountDisplay, /^\*{4}\d{4}$/);
  assert.equal(result.body.items[0].accountNumber, undefined);
});
test('invalid customer identifier is rejected', async t => {
  const { get } = await fixture(t);
  assert.equal((await get('/vbc/customers/invalid/payments')).body.error.code, 'INVALID_CUSTOMER_ID');
});
for (const params of ['page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=10001', 'pageSize=51', 'pageSize=', 'page=1&page=2', 'secret=x', 'scenario=unknown']) {
  test(`invalid query is rejected: ${params}`, async t => {
    const { get } = await fixture(t);
    assert.equal((await get(path + '?' + params)).status, 400);
  });
}
test('provider outage becomes a sanitized 502', async t => {
  const { get } = await fixture(t);
  const result = await get(path + '?scenario=unavailable');
  assert.equal(result.status, 502);
  assert.equal(result.body.error.code, 'PROVIDER_UNAVAILABLE');
  assert.equal(JSON.stringify(result.body).includes('stack'), false);
});
test('provider deadline becomes a 504', async t => {
  // Keep a deliberately short deadline only for the deliberate slow-provider test.
  const { get } = await fixture(t, { timeoutMs: 100, slowMs: 1000 });
  const result = await get(path + '?scenario=slow');
  assert.equal(result.status, 504);
  assert.equal(result.body.error.code, 'PROVIDER_TIMEOUT');
});
test('malformed provider payload becomes a 502', async t => {
  const { get } = await fixture(t);
  assert.equal((await get(path + '?scenario=malformed')).body.error.code, 'INVALID_PROVIDER_RESPONSE');
});
test('correlation id propagates through both layers without logging customer data', async t => {
  const { get, logs } = await fixture(t);
  const result = await get(path, { headers: { 'x-correlation-id': 'demo-test-123' } });
  assert.equal(result.headers.get('x-correlation-id'), 'demo-test-123');
  assert.equal(logs.length, 2);
  assert.ok(logs.every(row => row.correlationId === 'demo-test-123'));
  assert.equal(JSON.stringify(logs).includes('CUST-1001'), false);
  assert.equal(JSON.stringify(logs).includes('0042'), false);
});
test('unsafe correlation id is replaced, not reflected', async t => {
  const { get } = await fixture(t);
  const result = await get(path, { headers: { 'x-correlation-id': 'bad id /?' } });
  assert.match(result.headers.get('x-correlation-id'), /^[0-9a-f-]{36}$/);
});
test('errors share the response correlation id', async t => {
  const { get } = await fixture(t);
  const result = await get(path + '?scenario=unavailable');
  assert.equal(result.body.error.correlationId, result.headers.get('x-correlation-id'));
});
test('mutation requests and unknown routes are rejected', async t => {
  const { get } = await fixture(t);
  assert.equal((await get(path, { method: 'POST' })).status, 405);
  assert.equal((await get('/unknown')).status, 404);
});
test('mapping rejects wrong-customer data, unknown statuses and unmasked accounts', () => {
  for (const change of [{ customerId: 'CUST-1002' }, { status: 'UNRECOGNIZED' },
    { accountDisplay: '123456780042' }, { amountMinor: -1 }, { currency: 'USD' }]) {
    assert.throws(() => mapPage({ items: [{ ...payments[0], ...change }], page: 1, pageSize: 2, total: 1 }, query), { code: 'INVALID_PROVIDER_RESPONSE' });
  }
});
test('mapping rejects duplicate payment keys and inconsistent pagination', () => {
  assert.throws(() => mapPage({ items: [payments[0], payments[0]], page: 1, pageSize: 2, total: 2 }, query), { code: 'INVALID_PROVIDER_RESPONSE' });
  assert.throws(() => mapPage({ items: [], page: 2, pageSize: 2, total: 0 }, query), { code: 'INVALID_PROVIDER_RESPONSE' });
});
test('network failure is normalized without exposing internal error details', async () => {
  await assert.rejects(queryPayments('http://localhost', query, 'unit', {
    fetchImpl: async () => { throw new Error('private-hostname'); }
  }), { status: 502, code: 'PROVIDER_UNAVAILABLE', message: 'The payment service is unavailable.' });
});
test('invalid JSON response is normalized', async () => {
  await assert.rejects(queryPayments('http://localhost', query, 'unit', {
    fetchImpl: async () => new Response('not JSON')
  }), { status: 502, code: 'INVALID_PROVIDER_RESPONSE' });
});

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { payments, knownCustomers } from './data.js';
import { parseQuery } from './validation.js';
import { fields } from './mapping.js';
import { queryPayments } from './adapter.js';
import { AppError } from './errors.js';

export function createDemoServer({ timeoutMs = 500, slowMs = 1500, log = () => {} } = {}) {
  const server = http.createServer(async (req, res) => {
    const supplied = req.headers['x-correlation-id'];
    const correlationId = typeof supplied === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(supplied) ? supplied : randomUUID();
    const started = Date.now();
    let route = 'unknown';
    function send(status, body) {
      if (res.destroyed) return;
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store', 'x-correlation-id': correlationId, 'x-content-type-options': 'nosniff' });
      res.end(JSON.stringify(body));
      // Never log request URLs, customer identifiers, payloads or account details.
      log({ correlationId, route, status, durationMs: Date.now() - started });
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET') throw new AppError(405, 'METHOD_NOT_ALLOWED', 'This demo is read-only; use GET.');
      if (url.pathname === '/health') return send(200, { status: 'ok', demo: true });
      if (url.pathname === '/vbc/init') {
        route = 'mock-init';
        return send(200, { type: 'MockPropertySet', properties: Object.fromEntries(fields.map(name => [name, ''])), children: [] });
      }
      const match = /^\/(api|vbc)\/customers\/([^/]+)\/payments$/.exec(url.pathname);
      if (!match) throw new AppError(404, 'NOT_FOUND', 'Route not found.');
      route = match[1] === 'api' ? 'mock-provider' : 'mock-query';
      const query = parseQuery(match[2], url.searchParams);
      if (match[1] === 'vbc') {
        // Trusted loopback destination: never derive provider host from a request header.
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        return send(200, await queryPayments(baseUrl, query, correlationId, { timeoutMs }));
      }
      if (!knownCustomers.has(query.customerId)) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found.');
      if (query.scenario === 'unavailable') throw new AppError(503, 'DEMO_UNAVAILABLE', 'Simulated provider outage.');
      if (query.scenario === 'slow') await delay(slowMs);
      if (query.scenario === 'malformed') return send(200, { items: 'invalid demo payload' });
      const rows = payments.filter(row => row.customerId === query.customerId)
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt) || a.paymentId.localeCompare(b.paymentId));
      const offset = (query.page - 1) * query.pageSize;
      send(200, { items: rows.slice(offset, offset + query.pageSize), page: query.page, pageSize: query.pageSize, total: rows.length });
    } catch (error) {
      const known = error instanceof AppError;
      send(known ? error.status : 500, { error: { code: known ? error.code : 'INTERNAL_ERROR',
        message: known ? error.message : 'Unexpected demo error.', correlationId } });
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rawPort = process.env.PORT ?? '3000';
  if (!/^[0-9]+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    console.error('PORT must be an integer between 1 and 65535.'); process.exit(1);
  }
  const server = createDemoServer({ log: row => console.log(JSON.stringify(row)) });
  server.on('error', error => { console.error(`Cannot start demo: ${error.code}`); process.exitCode = 1; });
  server.listen(Number(rawPort), '127.0.0.1', () => console.log(`Local demo: http://127.0.0.1:${rawPort}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}

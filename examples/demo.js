import { once } from 'node:events';
import { createDemoServer } from '../src/server.js';
const server = createDemoServer({ timeoutMs: 1000, slowMs: 2000 });
server.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  for (const path of ['/vbc/init', '/vbc/customers/CUST-1001/payments',
    '/vbc/customers/CUST-1003/payments', '/vbc/customers/CUST-1001/payments?scenario=unavailable',
    '/vbc/customers/CUST-1001/payments?scenario=slow']) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    console.log(`\nGET ${path} -> ${response.status}`);
    console.log(JSON.stringify(await response.json(), null, 2));
  }
} finally { server.close(); server.closeAllConnections(); }

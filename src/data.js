// Entirely fictional data. Account identifiers are masked at the source.
export const payments = Object.freeze([
  { paymentId: 'PAY-003', customerId: 'CUST-1001', paidAt: '2026-09-23', amountMinor: 129950, currency: 'TRY', status: 'SETTLED', accountDisplay: '****0042' },
  { paymentId: 'PAY-002', customerId: 'CUST-1001', paidAt: '2026-09-17', amountMinor: 7500, currency: 'TRY', status: 'PENDING', accountDisplay: '****0042' },
  { paymentId: 'PAY-001', customerId: 'CUST-1001', paidAt: '2026-09-02', amountMinor: 49000, currency: 'TRY', status: 'FAILED', accountDisplay: '****0042' },
  { paymentId: 'PAY-004', customerId: 'CUST-1002', paidAt: '2026-09-21', amountMinor: 32000, currency: 'TRY', status: 'SETTLED', accountDisplay: '****0078' }
].map(Object.freeze));
export const knownCustomers = new Set(['CUST-1001', 'CUST-1002', 'CUST-1003']);

import { AppError } from './errors.js';
export const fields = Object.freeze([
  'External Payment Id', 'Customer External Id', 'Payment Date',
  'Amount', 'Currency', 'Payment Status', 'Masked Account'
]);
const statuses = { SETTLED: 'Completed', PENDING: 'Pending', FAILED: 'Failed' };
function validRecord(row, customerId) {
  return row && /^PAY-[0-9]+$/.test(row.paymentId) && row.customerId === customerId &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.paidAt) &&
    Number.isSafeInteger(row.amountMinor) && row.amountMinor >= 0 &&
    row.currency === 'TRY' && Object.hasOwn(statuses, row.status) &&
    /^\*{4}[0-9]{4}$/.test(row.accountDisplay);
}
export function mapPage(payload, query) {
  if (!payload || !Array.isArray(payload.items) || payload.page !== query.page ||
      payload.pageSize !== query.pageSize || !Number.isSafeInteger(payload.total) || payload.total < 0 ||
      payload.items.length !== Math.min(query.pageSize, Math.max(0, payload.total - (query.page - 1) * query.pageSize)) ||
      payload.items.some(row => !validRecord(row, query.customerId)) ||
      new Set(payload.items.map(row => row.paymentId)).size !== payload.items.length) {
    throw new AppError(502, 'INVALID_PROVIDER_RESPONSE', 'The payment service returned an invalid response.');
  }
  // JSON teaching model only: not an actual Siebel PropertySet instance or wire format.
  return {
    type: 'MockPropertySet',
    properties: { Page: String(payload.page), PageSize: String(payload.pageSize),
      Total: String(payload.total), HasMore: String(query.page * query.pageSize < payload.total) },
    children: payload.items.map(row => ({
      type: 'MockRow',
      properties: {
        'External Payment Id': row.paymentId, 'Customer External Id': row.customerId,
        'Payment Date': row.paidAt,
        Amount: `${Math.floor(row.amountMinor / 100)}.${String(row.amountMinor % 100).padStart(2, '0')}`,
        Currency: row.currency, 'Payment Status': statuses[row.status], 'Masked Account': row.accountDisplay
      }, children: []
    }))
  };
}

import { AppError } from './errors.js';
export function parseQuery(customerId, params) {
  if (!/^CUST-[0-9]{4}$/.test(customerId)) {
    throw new AppError(400, 'INVALID_CUSTOMER_ID', 'Use a customer identifier such as CUST-1001.');
  }
  const allowed = new Set(['page', 'pageSize', 'scenario']);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) {
      throw new AppError(400, 'INVALID_QUERY', 'Unknown or repeated query parameter.');
    }
  }
  function integer(name, fallback, max) {
    const text = params.get(name) ?? String(fallback);
    if (!/^[1-9][0-9]*$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) > max) {
      throw new AppError(400, 'INVALID_PAGINATION', `${name} must be an integer between 1 and ${max}.`);
    }
    return Number(text);
  }
  const scenario = params.get('scenario') ?? 'normal';
  if (!['normal', 'unavailable', 'slow', 'malformed'].includes(scenario)) {
    throw new AppError(400, 'INVALID_SCENARIO', 'Unsupported demo scenario.');
  }
  return { customerId, page: integer('page', 1, 10000), pageSize: integer('pageSize', 2, 50), scenario };
}

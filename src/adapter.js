import { AppError } from './errors.js';
import { mapPage } from './mapping.js';
export async function queryPayments(baseUrl, query, correlationId, { timeoutMs = 500, fetchImpl = fetch } = {}) {
  const url = new URL(`/api/customers/${query.customerId}/payments`, baseUrl);
  url.search = new URLSearchParams({ page: query.page, pageSize: query.pageSize, scenario: query.scenario });
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetchImpl(url, { headers: { 'x-correlation-id': correlationId }, signal, redirect: 'error' });
    if (response.status === 404) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found.');
    if (!response.ok) throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'The payment service is unavailable.');
    let payload;
    try { payload = await response.json(); }
    catch (error) {
      if (signal.aborted) throw error;
      throw new AppError(502, 'INVALID_PROVIDER_RESPONSE', 'The payment service returned an invalid response.');
    }
    return mapPage(payload, query);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (signal.aborted) throw new AppError(504, 'PROVIDER_TIMEOUT', 'The payment service did not respond in time.');
    throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'The payment service is unavailable.');
  }
}

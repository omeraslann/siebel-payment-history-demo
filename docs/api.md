# Local API contract

Base URL: `http://127.0.0.1:3000`. Only GET is supported. JSON responses use `Cache-Control: no-store` and an `x-correlation-id` header.

| Route | Purpose |
| --- | --- |
| /health | Local liveness and demo marker |
| /api/customers/{customerId}/payments | Fictional provider data |
| /vbc/init | Supported field names in the mock model |
| /vbc/customers/{customerId}/payments | Adapter result in the mock model |

## Payment query parameters

| Name | Default | Allowed values |
| --- | --- | --- |
| page | 1 | Integer 1–10,000 |
| pageSize | 2 | Integer 1–50 |
| scenario | normal | normal, unavailable, slow, malformed |

Unknown and repeated query parameters are rejected on payment routes. Customer IDs must match `CUST-` followed by four digits. `CUST-1001` has three records, `CUST-1002` has one, and `CUST-1003` has none. Other correctly shaped IDs are missing customers. There are no real customer names or account numbers.

`/vbc/init` and `/health` do not use query parameters. `/vbc/init` is an educational field-list endpoint, not an actual Siebel invocation.

## Provider success

```json
{
  "items": [{
    "paymentId": "PAY-003",
    "customerId": "CUST-1001",
    "paidAt": "2026-09-23",
    "amountMinor": 129950,
    "currency": "TRY",
    "status": "SETTLED",
    "accountDisplay": "****0042"
  }],
  "page": 1,
  "pageSize": 1,
  "total": 3
}
```

## Adapter error example

```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "The payment service is unavailable.",
    "correlationId": "demo-request-1"
  }
}
```

Pass `-H "x-correlation-id: demo-request-1"` to curl to supply that example correlation ID. The error body's correlation ID matches the response header. One parent query causes a provider request; both log entries carry the same ID.

## Status summary

- 200: successful result, including empty history or a page beyond the last page
- 400: invalid customer syntax, pagination or payment-route query parameters
- 404: route or customer missing
- 405: non-GET request
- 502: provider failure, network failure, invalid JSON or invalid response shape at the adapter
- 503: deliberately unavailable provider when calling `/api` directly
- 504: adapter deadline exceeded
- 500: unexpected internal failure, without implementation details

The slow provider waits 1,500 ms by default; the adapter deadline is 500 ms. A direct `/api` request with `scenario=slow` will eventually succeed. The corresponding `/vbc` request times out. The `malformed` provider scenario intentionally returns an invalid successful body so the adapter's validation can be observed.

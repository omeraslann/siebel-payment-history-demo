# Architecture and decisions

## Runnable flow

```text
curl / demo script
        |
        v
GET /vbc/customers/:customerId/payments
        | validate request; keep/generate correlation ID
        v
queryPayments() -- HTTP + 500 ms deadline --> GET /api/customers/:id/payments
        |                                           |
        |                                      synthetic fixture
        v
validate provider page -> mapPage() -> MockPropertySet JSON
```

Both routes run in one loopback-only process to keep setup small. The HTTP boundary is real; the external service and CRM consumer are simulated. The adapter uses a server-owned loopback address, never a caller-supplied host. The data-flow outline for an eventual Siebel deployment is in [the separate plan](siebel-plan.md).

## Mapping contract

| Provider property | Mock field | Rule |
| --- | --- | --- |
| paymentId | External Payment Id | Required external key; no native system field claim |
| customerId | Customer External Id | Must equal the requested customer |
| paidAt | Payment Date | ISO date-shaped string |
| amountMinor | Amount | Nonnegative safe integer minor units, rendered as a decimal string |
| currency | Currency | TRY only in this version |
| status | Payment Status | SETTLED → Completed; PENDING → Pending; FAILED → Failed |
| accountDisplay | Masked Account | Exactly four asterisks followed by four digits |

No account number is stored and then masked at presentation time: the synthetic source contains only masked account displays. Unknown statuses and unmasked values are rejected rather than silently propagated. All field values in the mock row are strings.

## Pagination

The provider sorts by payment date descending, then payment ID ascending as a stable tie-breaker. Page numbers are one-based; page size defaults to 2 and is limited to 50. The maximum page is 10,000. An out-of-range page succeeds with an empty list and the original total. An empty known customer succeeds with total 0; an unknown customer returns 404.

This offset model is adequate for static fixtures. A changing upstream system would need a documented snapshot or cursor contract to avoid duplicates or omissions between pages. Page metadata is a demo convention, not a native VBC paging implementation.

## Error boundary

Request errors are 400; missing customers are 404. The adapter converts upstream non-success responses to 502, preserving the explicit missing-customer case. Network failures also become 502. A deadline becomes 504. Malformed JSON and schema mismatches become 502. These errors contain a stable code, a safe message and a correlation ID, without a stack trace or provider body.

The deadline covers receiving the HTTP response and reading its JSON body. This demo makes no automatic retries. Adding retries should consider load, time budgets and the upstream contract, even for a read-only operation.

## Observability and security boundary

Logs contain a validated correlation ID, a route label, status and elapsed milliseconds. They omit request URLs and payment/customer data. An invalid correlation header is replaced with a UUID. Callers should use random non-personal correlation IDs.

The listener binds to 127.0.0.1; it has no authentication, authorization or TLS. It is unsuitable for public hosting. In a real system, additional controls include authenticated identity, customer-level access checks, secret management, rate limits, response size limits, audit/retention policy, transport encryption and deployment-specific monitoring.

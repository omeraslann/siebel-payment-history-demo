# Siebel Payment History Integration Demo

A small, runnable portfolio project for practising Siebel integration design without installing Siebel Tools or a Siebel application.

The example models a read-only payment-history screen. A local REST service provides fictional payment records. A JavaScript adapter validates the response and converts it into a **Siebel-inspired PropertySet teaching model**. A separate design note explains how the same responsibility could fit a Virtual Business Component (VBC) and business service.

**Scope:** the Node.js service, mapping and tests run locally. The Siebel configuration is a design proposal. This project has not been deployed or tested inside Siebel, and its JSON model is not Siebel's API or native PropertySet format.

## Quick start

Install Node.js 22 or newer from the official Node.js website. No npm packages, database, credentials or external services are required.

Extract the ZIP, open a terminal in `siebel-payment-history-demo`, then run:

```sh
npm test
npm run demo
```

The demo starts its own temporary local server, prints successful and failed requests, and exits. To explore the API yourself:

```sh
npm start
```

Leave that terminal running. In a second terminal:

```sh
curl "http://127.0.0.1:3000/health"
curl "http://127.0.0.1:3000/vbc/init"
curl "http://127.0.0.1:3000/api/customers/CUST-1001/payments?page=1&pageSize=2"
curl "http://127.0.0.1:3000/vbc/customers/CUST-1001/payments?page=1&pageSize=2"
curl "http://127.0.0.1:3000/vbc/customers/CUST-1001/payments?page=2&pageSize=2"
```

On Windows PowerShell, use `curl.exe` for these commands. Press Ctrl+C in the server terminal to stop it. If port 3000 is occupied, use another port: `PORT=3005 npm start` on macOS/Linux, or `$env:PORT=3005; npm start` in PowerShell, and update the request URLs.

## What the project demonstrates

- REST integration over real local HTTP, with no third-party dependencies
- Explicit field and status mapping into string-valued mock rows
- Stable, bounded pagination and the difference between no history and no customer
- Integer minor-unit amounts converted to decimal strings
- Input and provider-response validation
- Timeout, provider outage and malformed-response handling
- Correlation IDs across the adapter and mock provider
- Masked account identifiers and minimal structured logs
- Automated unit and HTTP integration tests
- A clear boundary between runnable code and proposed Siebel configuration

### Example mapped record

```json
{
  "type": "MockRow",
  "properties": {
    "External Payment Id": "PAY-003",
    "Customer External Id": "CUST-1001",
    "Payment Date": "2026-09-23",
    "Amount": "1299.50",
    "Currency": "TRY",
    "Payment Status": "Completed",
    "Masked Account": "****0042"
  },
  "children": []
}
```

The outer result includes `Page`, `PageSize`, `Total` and `HasMore` as strings. These are this demo's own metadata properties; they do not claim native Siebel paging compatibility.

## Try the boundaries

```sh
# Known customer with no history: 200, no children
curl "http://127.0.0.1:3000/vbc/customers/CUST-1003/payments"
# Missing customer: 404
curl -i "http://127.0.0.1:3000/vbc/customers/CUST-9999/payments"
# Invalid pagination: 400
curl -i "http://127.0.0.1:3000/vbc/customers/CUST-1001/payments?page=0"
# Simulated outage: 502 at the adapter
curl -i "http://127.0.0.1:3000/vbc/customers/CUST-1001/payments?scenario=unavailable"
# Simulated slow provider: 504 after the adapter's 500 ms deadline
curl -i "http://127.0.0.1:3000/vbc/customers/CUST-1001/payments?scenario=slow"
# Invalid provider response: 502
curl -i "http://127.0.0.1:3000/vbc/customers/CUST-1001/payments?scenario=malformed"
```

The `scenario` parameter is a deliberate local demonstration switch. It must be removed from a real integration.

## Project map

```text
src/server.js          Local REST provider and mock VBC routes
src/adapter.js         HTTP call, deadline and error normalization
src/mapping.js         Provider validation and mock PropertySet mapping
src/validation.js      Customer, pagination and query validation
src/data.js            Fictional, already-masked records
src/errors.js          Small typed application error
examples/demo.js       Self-contained walkthrough
examples/success.json  Captured successful response
examples/error.json    Captured error response
test/demo.test.js     Unit and HTTP integration tests
docs/architecture.md  Flow, mapping decisions and trade-offs
docs/api.md           Request/response contract
docs/siebel-plan.md   Future VBC/business-service configuration plan
docs/test-report.md   Actual verification and remaining gaps
```

See [architecture](docs/architecture.md), [API contract](docs/api.md), [Siebel implementation plan](docs/siebel-plan.md) and [test report](docs/test-report.md).

## A short project explanation

This example separates the external payment contract from the fields needed by a CRM screen. The adapter gives the screen a small, stable result shape, checks that each row belongs to the requested customer, and reports service failures consistently. The accompanying VBC plan describes where those responsibilities would sit in a Siebel implementation. The automated tests demonstrate the JavaScript integration logic independently of Siebel infrastructure.

## Limits and next steps

This is a local educational demo using synthetic data. It does not connect to a bank, process payments, authenticate users, authorize customer access, or provide production security. The customer identifier is a lookup key, not proof that the caller may view that customer. Do not expose this server publicly or use real customer records.

The model supports only TRY with two decimal places and read-only history. There is no arbitrary Siebel search-spec parser, real applet, native PropertySet, transaction processing, database, persistence, caching, retry policy or production deployment. Dates in the synthetic fixture are ISO date strings; real provider date semantics and time zones need a separate contract.

Before a real implementation: validate the target Siebel release, implement the native business service and supported transport, map CRM customer keys, enforce authentication and customer-level authorization, agree paging/search semantics, remove scenario switches, add response size limits and operational controls, then test in a licensed Siebel environment.

## Publishing and licensing

The repository contains original demonstration code and fictional data, with no client-specific code or credentials. No open-source license is selected yet. Choose an appropriate license before granting reuse rights; a public repository alone is not a license grant.

GitHub Actions configuration is included to run tests on Node.js 22 and 24 after publication. Local verification does not imply that a hosted CI run has passed.

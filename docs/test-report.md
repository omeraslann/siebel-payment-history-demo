# Verification report

Verified 8 October 2026 on Linux using Node.js v24.19.0. All data and requests stayed within the local mock. No Siebel installation, bank API, external credentials or npm dependency download was used.

## Automated results

- `npm test`: 30 tests passed; 0 failed, skipped or cancelled.
- `npm run test:coverage`: 30 tests passed; 94.67% line coverage, 93.68% branch coverage and 75.00% function coverage across `src`.
- `npm run demo`: completed and printed Init, successful history, empty history, outage and timeout examples.
- Syntax checks: all JavaScript source, test and example files passed `node --check`.

Coverage is measured by Node's built-in experimental coverage reporter and can differ by Node version. The command-line startup/shutdown block is not covered by unit instrumentation; it was exercised separately with `npm start`, curl and termination. Coverage is not a claim of production readiness.

## Covered cases

- Health and Init field list
- HTTP provider-to-adapter mapping, string amounts and stable payment keys
- Second page, beyond-last-page and empty known customer
- Missing customer and customer isolation
- Already-masked source data
- Invalid identifiers, malformed/out-of-range pagination, duplicate or unknown parameters
- Provider outage, timeout, malformed payload and invalid JSON
- Network error normalization
- Correlation propagation, unsafe correlation replacement and error correlation
- Logs omit customer IDs and account display values
- Non-GET requests and unknown routes
- Rejection of unexpected statuses, wrong-customer records, unmasked accounts, negative amounts, unsupported currencies, duplicate keys and inconsistent page metadata

## Packaging and command checks

The ZIP was extracted into a separate temporary directory. The extracted project passed `npm test` and `npm run demo`. README curl examples were exercised against the extracted project's `npm start` server, including the expected 200, 400, 404, 502 and 504 cases. A separate process also verified the alternate PORT setting. ZIP entries were compared with the source manifest and checked for unsafe paths.

## Not verified

Native Siebel configuration, eScript, real PropertySets, applet rendering, search-spec translation, native paging, access control, external transport, real provider integration, Node.js 22, Windows/macOS and hosted GitHub Actions have not been verified locally. The included CI workflow is intended to test Node.js 22 and 24 after publication. A hosted pass must be confirmed separately.

## CI timing correction

The first published revision passed the hosted Node.js 22 job, but its Node.js 24 job exposed a timing-sensitive test: the shared 120 ms test deadline expired during an otherwise successful HTTP request. Ordinary tests now use a 2,000 ms budget. The timeout test uses a separate 100 ms deadline against a deliberate 1,000 ms provider delay and still requires HTTP 504 with `PROVIDER_TIMEOUT`. The walkthrough uses a 1,000 ms deadline and a 2,000 ms fault delay. The interactive server's default 500 ms deadline is unchanged.

After this correction, five consecutive local runs of both `npm test` (30/30 each time) and `npm run demo` passed on Node.js 24.19.0. Coverage remained unchanged. The replacement ZIP was extracted and reverified. Hosted CI for this correction must be checked on its exact new commit; the earlier job results do not establish that it passed.

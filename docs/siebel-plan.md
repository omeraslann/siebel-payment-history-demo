# Siebel implementation plan: design only

Nothing in this directory is a Siebel repository export or deployable eScript. The proposed names below are original example names. Verify all settings and interfaces against the target release before implementation.

## Documented foundation

Oracle documents VBCs as a way to represent external data without an underlying Siebel table. The VBC class is `CSSBCVExtern`; a custom business service uses `CSSService`. The VBC's `Service Name` user property selects that service. Custom services must support `Init` and `Query`, using Inputs and Outputs property sets; mutation methods depend on the use case. Query results contain one child property set per matching record. Oracle cautions against outputting system fields such as `Id`.

Source: [Oracle Siebel Virtual Business Components](https://docs.oracle.com/cd/F26413_24/books/EAI2/siebel-virtual-business-components.html), especially Creating a New Virtual Business Component, Setting User Properties, Custom Business Service Methods and Query Method. Checked 8 October 2026. These documented concepts motivate the following proposal; the proposal has not been validated in Siebel.

## Proposed repository objects

| Proposed object | Design intent |
| --- | --- |
| Demo Payment History VBC | Read-only component for the external history |
| Demo Payment History Service | Custom business service responsible for Init/Query and transport/mapping |
| Demo Payment History List Applet | List of payment fields, connected to the target application's customer context |
| Target customer business object/view | Add only after identifying the correct existing customer object and access model |

Suggested fields: External Payment Id, Customer External Id, Payment Date, Amount, Currency, Payment Status and Masked Account. Confirm native field types, display formatting and external-key handling in the target environment. Keep the external payment key distinct from native system fields.

## Proposed service responsibilities

1. Init: declare the supported field contract using real Siebel property sets.
2. Query: obtain an authorized customer context and explicitly supported search criteria.
3. Translate that context into a validated provider request. Do not execute or concatenate arbitrary incoming search expressions.
4. Invoke an approved transport using server-managed configuration and credentials.
5. Validate the provider response; map each row to the target release's native output property-set contract.
6. Convert errors to the application's agreed user-visible and logged behavior, retaining a correlation reference.

The local JavaScript modules illustrate steps 3–6. Node's `fetch`, ES modules, promises and `AbortSignal` are not copy-and-paste Siebel eScript. Implement equivalent behavior through supported Siebel facilities and test it there.

## Integration and UI checklist

- Identify the parent customer business component and a stable external customer key.
- Decide link/context propagation, supported queries and sort behavior; validate missing-parent handling.
- Make the applet and component read-only and avoid implementing mutation methods for this use case.
- Agree how a VBC query maps to provider paging. Demo `Page` and `HasMore` do not implement native scrolling or cursor behavior.
- Verify transport availability, network policy, credentials, timeout settings and JSON support for the target release.
- Keep transport destinations in trusted server configuration; never accept an arbitrary caller-supplied URL.
- Apply customer access control before querying the provider. A guessed customer ID must not grant access.
- Choose user-visible failure messaging and verify that sensitive data is absent from diagnostics.
- Validate and deploy using the team's release-specific repository workflow.

## Acceptance tests once Siebel is available

- Init exposes the intended fields and Query renders the mapped rows in the applet.
- Switching parent customers changes the history without leaking the previous customer's records.
- Empty history, missing customer and missing parent context behave as designed.
- Supported filters, sort and scrolling agree with the provider contract.
- Timeout/outage recovery and user messages behave correctly.
- A user cannot retrieve another customer's history through a modified query.
- Date/currency display matches the application locale and the agreed data contract.
- Read-only controls prevent changes, and trace/log review finds no unmasked identifiers.

No item in this Siebel acceptance list has been executed. A licensed environment and target-release configuration are required.

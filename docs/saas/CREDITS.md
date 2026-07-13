# Credits and usage accounting

## Ledger invariant

`credit_ledger_entries` is append-only. Every row has a signed integer amount in **microcredits**, a stable idempotency key, a reason, and optional usage/subscription references. One commercial credit equals 1,000 microcredits.

Balance is:

```text
SUM(amount_microcredits) for committed entries owned by the user
```

No route updates a balance column. Corrections are compensating entries.

## Reservation and settlement

1. Authorize the feature and model tier.
2. Create a negative reservation entry with request idempotency key.
3. Call the provider.
4. Record measured usage.
5. Append a settlement delta (refund unused reservation or charge overage).
6. On provider failure, append a full release entry.

All steps that alter local accounting run transactionally. A retry with the same idempotency key returns the existing result.

## Units

- Transcription: provider audio seconds and computed billable minutes.
- Answers: input, cached-input, and output tokens plus selected model.
- Retrieval/storage: reserved for future meters and initially disabled.

Usage records contain metrics, IDs, and timing only—never transcript, prompt, answer, or document content.

## Period grants

Trial and subscription allowances are grants in the ledger with deterministic keys such as `grant:<subscription>:<period-start>`. Webhook redelivery cannot grant twice. Unused recurring credits expire through an explicit negative expiry entry; history is preserved.

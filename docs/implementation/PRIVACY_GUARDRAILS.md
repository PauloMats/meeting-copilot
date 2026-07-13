# Privacy guardrails

## Defaults

- Audio is not saved.
- Settings are local.
- Transcripts and answers are treated as sensitive.
- Provider credentials are short-lived where possible.

## Logging

Allowed:

- `turnId`
- durations in milliseconds
- state names
- language code
- model name
- input/output character counts
- coarse error categories

Not allowed by default:

- raw audio
- transcript text
- answer text
- API keys
- access tokens
- emails, names, phone numbers, or customer data

## Retention

- Audio retention default: 0 days.
- Transcript retention default: 30 days only if persistence is explicitly wired and enabled.
- Redaction must happen before any persisted transcript is made searchable.

## Manual pilot constraint

Real meeting testing must use informed consent and non-sensitive meetings until retention, deletion, and access controls are implemented.

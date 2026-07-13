# Plans and entitlements

Plan codes are stable internal identifiers. Prices and included amounts below are launch hypotheses, not activated production offers.

| Plan     |      Suggested allowance | Answer tier               | Devices |             Commercial hypothesis |
| -------- | -----------------------: | ------------------------- | ------: | --------------------------------: |
| Trial    | 30 transcription minutes | Basic                     |       1 | Free, one grant per verified user |
| Basic    |        180 minutes/month | Basic (`gpt-5.4-nano`)    |       1 |                        R$59/month |
| Pro      |        480 minutes/month | Balanced (`gpt-5.4-mini`) |       3 |                       R$149/month |
| Advanced |      1,200 minutes/month | Advanced (`gpt-5.4`)      |       5 |                       R$299/month |

Entitlements are backend data, not UI flags:

- `transcription_seconds_per_period`
- `answer_model_tier`
- `max_active_devices`
- `context_profiles_limit`
- `document_retrieval_enabled`
- `history_retention_days`

Model names remain server configuration. Changing a provider model does not require changing Stripe products or desktop releases.

Top-ups are modeled as one-time ledger grants but are not exposed at launch. Launching top-ups requires expiry, refund, tax, and abuse policy approval.

# Unit economics

These numbers are planning assumptions, not guarantees. Provider prices must be rechecked before production approval.

## Sources and assumptions

- OpenAI `gpt-5.4-nano`: US$0.20/M input and US$1.25/M output tokens.
- `gpt-5.4-mini`: US$0.75/M input and US$4.50/M output tokens.
- `gpt-5.4`: US$2.50/M input and US$15/M output tokens.
- `gpt-realtime-whisper`: US$0.017 per audio minute.
- Planning FX: R$6.00/US$1.00. This is deliberately conservative and configurable—not a market quote.
- Typical answer: 1,000 input tokens and 180 output tokens.
- Stripe Brazil public pricing pages showed 3.99% plus a fixed fee and Stripe Billing at 0.7%; the fixed fee differed between public pages (R$0.39 versus R$0.50). Use R$0.50 for planning and verify the account contract before launch.
- Railway Hobby starts at US$5/month including US$5 usage; actual compute/database costs require telemetry.

## Marginal AI cost

| Operation              | Estimated provider cost |
| ---------------------- | ----------------------: |
| One Basic answer       |             US$0.000425 |
| One Balanced answer    |              US$0.00156 |
| One Advanced answer    |              US$0.00520 |
| One transcription hour |                 US$1.02 |

Transcription dominates marginal AI cost. Model-tier changes are commercially useful, but audio allowance is the primary margin control.

## Monthly scenarios

| Scenario           |     Audio |      Answers | AI estimate | At planning FX |
| ------------------ | --------: | -----------: | ----------: | -------------: |
| Trial              |    30 min |     20 Basic |    ~US$0.52 |        ~R$3.11 |
| Basic allowance    |   180 min |     80 Basic |    ~US$3.09 |       ~R$18.56 |
| Pro allowance      |   480 min | 250 Balanced |    ~US$8.55 |       ~R$51.29 |
| Advanced allowance | 1,200 min | 600 Advanced |   ~US$23.52 |      ~R$141.12 |

These figures exclude taxes, support, refunds, email, observability, database, egress, idle capacity, fraud, and payment fees. The Advanced hypothesis has limited margin at full consumption and should be validated with real distribution data before sale.

## Telemetry required before pricing approval

- captured versus billable audio seconds;
- questions per meeting hour;
- input/cached/output token percentiles by tier;
- provider retries and failures;
- active-user database and API cost;
- checkout conversion, churn, refunds, and support load.

Official references:

- https://developers.openai.com/api/docs/models/gpt-5.4-nano
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/models/gpt-5.4
- https://openai.com/index/advancing-voice-intelligence-with-new-models-in-the-api/
- https://stripe.com/br/pricing
- https://docs.stripe.com/billing
- https://docs.railway.com/pricing/plans

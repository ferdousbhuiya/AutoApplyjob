# API Cost Analysis

## AI Service Used

### Anthropic Claude (`claude-haiku-4-5-20251001`)

| Model | Input Price | Output Price |
|-------|-------------|--------------|
| claude-haiku-4-5-20251001 | $1.00 / 1M tokens | $5.00 / 1M tokens |

> Note: CLAUDE.md originally specified `claude-3-5-haiku-20241022`, but that model has been retired (returns 404). The app uses the current Haiku model, `claude-haiku-4-5-20251001`, instead.

---

## Estimated Usage

### Feature 1: Job Extraction (`POST /api/ai/extract`)
- **Calls per user per day:** ~10 (one per scanned email, polling runs every 5 min)
- **Avg tokens per call:** ~600 input / ~150 output
- **Cost per call:** (600 × $1.00 + 150 × $5.00) / 1,000,000 ≈ $0.00135
- **Monthly cost per 100 users:** 100 users × 10 calls/day × 30 days × $0.00135 ≈ **$40.50**

### Feature 2: Resume + Cover Letter Generation (`POST /api/ai/generate`)
- **Calls per user per day:** ~3 (only run for jobs that pass extraction as real postings)
- **Avg tokens per call:** ~1,800 input (base resume + job description) / ~1,200 output (resume + cover letter)
- **Cost per call:** (1,800 × $1.00 + 1,200 × $5.00) / 1,000,000 ≈ $0.0078
- **Monthly cost per 100 users:** 100 users × 3 calls/day × 30 days × $0.0078 ≈ **$70.20**

---

## Total Estimated Monthly Cost

| Users | Estimated Cost |
|-------|----------------|
| 10    | ~$11.07        |
| 100   | ~$110.70       |
| 1,000 | ~$1,107.00     |

---

## Cost Optimization Notes

- Using `claude-haiku-4-5` (the fastest, most cost-effective current Claude model) since extraction and tailoring don't require frontier reasoning.
- In-memory rate limiter caps AI calls at 10/minute per server instance to prevent runaway costs from a polling bug or abuse.
- Extraction (Feature 1) runs before generation (Feature 2) so non-job emails are filtered out (`is_job_posting: false`) before the more expensive tailoring call.
- Draft mode (no auto-send) means a human reviews fit_score before any cost-incurring re-generation/edit cycles.

---

## References

- [Anthropic Pricing](https://www.anthropic.com/pricing)

import type { PurchaseInput, VendorMatch } from './types'
import { VENDOR_RUBRIC } from './verdictScoring'

export const buildSystemPrompt = () => {
  return `Role: You are a purchase evaluator. Your responsibility is to score purchase motivations and long-term utility against the user's profile and history.

Vendor rubric to use when vendor data is provided:
- Quality: ${VENDOR_RUBRIC.quality.definition}
  - low (${VENDOR_RUBRIC.quality.enum.low.score}): ${VENDOR_RUBRIC.quality.enum.low.description}
  - medium (${VENDOR_RUBRIC.quality.enum.medium.score}): ${VENDOR_RUBRIC.quality.enum.medium.description}
  - high (${VENDOR_RUBRIC.quality.enum.high.score}): ${VENDOR_RUBRIC.quality.enum.high.description}
- Reliability: ${VENDOR_RUBRIC.reliability.definition}
  - low (${VENDOR_RUBRIC.reliability.enum.low.score}): ${VENDOR_RUBRIC.reliability.enum.low.description}
  - medium (${VENDOR_RUBRIC.reliability.enum.medium.score}): ${VENDOR_RUBRIC.reliability.enum.medium.description}
  - high (${VENDOR_RUBRIC.reliability.enum.high.score}): ${VENDOR_RUBRIC.reliability.enum.high.description}
- Price tier: ${VENDOR_RUBRIC.price_tier.definition}
  - budget (${VENDOR_RUBRIC.price_tier.enum.budget.typical_multiplier}): ${VENDOR_RUBRIC.price_tier.enum.budget.description}
  - mid_range (${VENDOR_RUBRIC.price_tier.enum.mid_range.typical_multiplier}): ${VENDOR_RUBRIC.price_tier.enum.mid_range.description}
  - premium (${VENDOR_RUBRIC.price_tier.enum.premium.typical_multiplier}): ${VENDOR_RUBRIC.price_tier.enum.premium.description}
  - luxury (${VENDOR_RUBRIC.price_tier.enum.luxury.typical_multiplier}): ${VENDOR_RUBRIC.price_tier.enum.luxury.description}

If vendor data is missing, treat vendor attributes as unknown and do not invent them.

You must respond with valid JSON only, no other text.`
}

const formatVendorMatch = (vendorMatch: VendorMatch | null) => {
  if (!vendorMatch) {
    return 'Vendor match: not found in vendor database.'
  }

  const quality = VENDOR_RUBRIC.quality.enum[vendorMatch.vendor_quality]
  const reliability = VENDOR_RUBRIC.reliability.enum[vendorMatch.vendor_reliability]
  const priceTier = VENDOR_RUBRIC.price_tier.enum[vendorMatch.vendor_price_tier]

  return [
    `Vendor match: ${vendorMatch.vendor_name} (${vendorMatch.vendor_category})`,
    `- Quality: ${vendorMatch.vendor_quality} (${quality.score}) - ${quality.description}`,
    `- Reliability: ${vendorMatch.vendor_reliability} (${reliability.score}) - ${reliability.description}`,
    `- Price tier: ${vendorMatch.vendor_price_tier} (${priceTier.typical_multiplier}) - ${priceTier.description}`,
  ].join('\n')
}

export const buildUserPrompt = (
  input: PurchaseInput,
  profileContext: string,
  similarPurchases: string,
  recentPurchases: string,
  vendorMatch: VendorMatch | null
) => {
  return `${profileContext}

${similarPurchases}

${recentPurchases}

${formatVendorMatch(vendorMatch)}

Now evaluate this purchase:
- Item: ${input.title}
- Price: ${input.price !== null ? `$${input.price.toFixed(2)}` : 'Not specified'}
- Category: ${input.category ?? 'Uncategorized'}
- Vendor: ${input.vendor ?? 'Not specified'}
- User rationale: "${input.justification ?? 'No rationale provided'}"
- Important purchase: ${input.isImportant ? 'Yes' : 'No'}

Output the final verdict and scoring in this exact JSON format:
{
  "value_conflict": {
    "score": <number 0-1>,
    "explanation": "<brief explanation, be friendly and neutral>"
  },
  "emotional_impulse": {
    "score": <number 0-1>,
    "explanation": "<brief explanation, be friendly and neutral>"
  },
  "long_term_utility": {
    "score": <number 0-1>,
    "explanation": "<brief explanation, be friendly and neutral>"
  },
  "emotional_support": {
    "score": <number 0-1>,
    "explanation": "<brief explanation, be friendly and neutral>"
  },
  "rationale": "<2-3 sentence rationale. Walk through the user's values, purchase profile (recent/similar), and vendor quality/reliability/price tier when available. Refer to the rated scores, be friendly and neutral. When referencing values in brackets, use proper double quotes (\"\") not backticks.>"
}`
}

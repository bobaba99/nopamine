import type {
  EvaluationResult,
  PurchaseInput,
  ScoreExplanation,
  VerdictOutcome,
  VendorMatch,
} from './types'
import { clamp01 } from './utils'

export const WEIGHTS = {
  intercept: 0.18,
  value_conflict: 0.34,
  pattern_repetition: 0.41,
  emotional_impulse: 0.27,
  financial_strain: 0.12,
  long_term_utility: 0.29,
  emotional_support: 0.29,
}

export const VENDOR_RUBRIC = {
  quality: {
    definition: 'How well the product performs its intended function when it works.',
    enum: {
      low: {
        score: 0.4,
        description: 'Below-average performance; compromises are obvious.',
      },
      medium: {
        score: 0.6,
        description: 'Adequate performance; meets basic expectations.',
      },
      high: {
        score: 0.8,
        description: 'Strong performance; well-designed and efficient.',
      },
    },
  },
  reliability: {
    definition: 'How consistently the product maintains acceptable performance over time.',
    enum: {
      low: {
        score: 0.4,
        description: 'Noticeable failure risk; inconsistent durability.',
      },
      medium: {
        score: 0.6,
        description: 'Generally dependable with occasional issues.',
      },
      high: {
        score: 0.8,
        description: 'Rare failures; long-term dependable.',
      },
    },
  },
  price_tier: {
    definition: 'Relative market positioning of the product price level.',
    enum: {
      budget: {
        typical_multiplier: '<0.7x market median',
        description: 'Lowest-cost options; price is the primary selling point.',
      },
      mid_range: {
        typical_multiplier: '0.7-1.2x market median',
        description: 'Balanced cost and performance; mainstream pricing.',
      },
      premium: {
        typical_multiplier: '1.2-2x market median',
        description: 'Higher-than-average price; design, brand, or quality emphasis.',
      },
      luxury: {
        typical_multiplier: '>2x market median',
        description: 'Price driven mainly by brand, exclusivity, or status signaling.',
      },
    },
  },
} as const

const PRICE_TIER_RISK_POINTS = {
  budget: 0,
  mid_range: 4,
  premium: 8,
  luxury: 12,
} as const

export const getVendorRubricInfo = (vendorMatch?: VendorMatch | null) => {
  if (!vendorMatch) return null
  const quality = VENDOR_RUBRIC.quality.enum[vendorMatch.vendor_quality]
  const reliability = VENDOR_RUBRIC.reliability.enum[vendorMatch.vendor_reliability]
  const priceTier = VENDOR_RUBRIC.price_tier.enum[vendorMatch.vendor_price_tier]
  return { quality, reliability, priceTier }
}

const buildVendorUtilityScore = (vendorMatch?: VendorMatch | null) => {
  const info = getVendorRubricInfo(vendorMatch)
  if (!info || !vendorMatch) return null
  const utilityScore = clamp01((info.quality.score + info.reliability.score) / 2)
  const explanation = [
    `Vendor quality: ${vendorMatch.vendor_quality} (${info.quality.score}).`,
    `Vendor reliability: ${vendorMatch.vendor_reliability} (${info.reliability.score}).`,
    `Vendor price tier: ${vendorMatch.vendor_price_tier} (${info.priceTier.typical_multiplier}).`,
  ].join(' ')
  return buildScore(utilityScore, explanation)
}

const LINE_BREAK = '<br />'

const summarizeProfileContext = (summary?: string) => {
  if (!summary) return null
  if (summary.includes('Profile summary: not set.')) {
    return 'Your profile summary is not set yet, so this leans more on the purchase details.'
  }

  const parts: string[] = []
  const profileMatch = summary.match(/Profile summary:\n- (.+)/)
  if (profileMatch?.[1]) {
    const trimmed = profileMatch[1].trim().replace(/\.\s*$/, '')
    parts.push(`Your profile summary notes: ${trimmed}.`)
  }

  const budgetMatch = summary.match(/Weekly fun budget:\n- \\$([0-9.,]+)/)
  if (budgetMatch?.[1]) {
    parts.push(`Your weekly fun budget is $${budgetMatch[1]}.`)
  }

  const onboardingParts: string[] = []
  const coreValuesMatch = summary.match(/- Core values: (.+)/)
  if (coreValuesMatch?.[1]) {
    onboardingParts.push(
      `<strong>Core values:</strong> <em>"${coreValuesMatch[1]}"</em>.`
    )
  }
  const regretMatch = summary.match(/- Regret patterns: (.+)/)
  if (regretMatch?.[1]) {
    onboardingParts.push(`<strong>Regret patterns:</strong> <em>"${regretMatch[1]}"</em>.`)
  }
  const satisfactionMatch = summary.match(/- Satisfaction patterns: (.+)/)
  if (satisfactionMatch?.[1]) {
    onboardingParts.push(`<strong>Satisfaction patterns:</strong> <em>"${satisfactionMatch[1]}"</em>.`)
  }
  const decisionStyleMatch = summary.match(/- Decision style: (.+)/)
  if (decisionStyleMatch?.[1]) {
    onboardingParts.push(`<strong>Decision style:</strong> <em>"${decisionStyleMatch[1]}"</em>.`)
  }
  const financialSensitivityMatch = summary.match(/- Financial sensitivity: (.+)/)
  if (financialSensitivityMatch?.[1]) {
    onboardingParts.push(
      `<strong>Financial sensitivity:</strong> <em>"${financialSensitivityMatch[1]}"</em>.`
    )
  }
  const identityMatch = summary.match(/- Identity stability: (.+)/)
  if (identityMatch?.[1]) {
    onboardingParts.push(`Identity stability:</strong> <em>"${identityMatch[1]}"</em>.`)
  }
  const emotionalMatch = summary.match(/- Emotional relationship: (.+)/)
  if (emotionalMatch?.[1]) {
    onboardingParts.push(
      `<strong>Emotional relationship:</strong> <em>"${emotionalMatch[1]}"</em>.`
    )
  }

  if (onboardingParts.length > 0) {
    parts.push(...onboardingParts)
  }

  if (parts.length === 0) {
    return 'Your profile context guides this decision alongside the purchase details.'
  }

  return parts.join(LINE_BREAK)
}

const extractBulletLines = (text?: string) => {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, ''))
}

const summarizePurchaseProfile = (similar?: string, recent?: string) => {
  const parts: string[] = []
  const hasRecent = extractBulletLines(recent).length > 0
  const hasSimilar = extractBulletLines(similar).length > 0

  if (hasRecent) {
    parts.push('Past purchases suggest a baseline for your usual spending and categories.')
  } else if (recent?.includes('No purchase history')) {
    parts.push('Past purchases suggest limited recent history to compare against.')
  }

  if (hasSimilar) {
    parts.push('Similar purchases suggest how comparable items have felt for you before.')
  } else if (similar?.includes('No similar purchases found')) {
    parts.push('Similar purchases suggest there are no close historical matches yet.')
  }

  return parts.length > 0 ? parts.join(LINE_BREAK) : null
}

const summarizeVendorMatch = (vendorMatch?: VendorMatch | null) => {
  if (!vendorMatch) {
    return 'Vendor quality, reliability, and price tier are not available, so this relies on the item details.'
  }
  const rubric = getVendorRubricInfo(vendorMatch)
  if (!rubric) {
    return 'Vendor quality, reliability, and price tier are not available, so this relies on the item details.'
  }
  return `The vendor is rated ${vendorMatch.vendor_quality} on quality (${rubric.quality.score}) and ${vendorMatch.vendor_reliability} on reliability (${rubric.reliability.score}), with a ${vendorMatch.vendor_price_tier} price tier (${rubric.priceTier.typical_multiplier}).`
}

const summarizeRiskSignals = (
  reasons: string[],
  patternRepetition?: ScoreExplanation,
  financialStrain?: ScoreExplanation
) => {
  const parts: string[] = []
  if (reasons.length > 0) {
    const normalizedReasons = reasons.map((reason) => reason.toLowerCase())
    const [first, second, ...rest] = normalizedReasons
    if (normalizedReasons.length === 1) {
      parts.push(`On the item itself, ${first} stands out.`)
    } else if (normalizedReasons.length === 2) {
      parts.push(`On the item itself, ${first} and ${second} stand out.`)
    } else {
      parts.push(
        `On the item itself, ${first} and ${second} stand out, plus ${rest.join(', ')}.`
      )
    }
  }

  if (patternRepetition) {
    const explanation = patternRepetition.explanation.trim().replace(/\.\s*$/, '')
    parts.push(`Pattern signal: ${explanation}.`)
  }
  if (financialStrain) {
    const explanation = financialStrain.explanation.trim().replace(/\.\s*$/, '')
    parts.push(`Budget context: ${explanation}.`)
  }

  return parts.length > 0 ? parts.join(LINE_BREAK) : null
}

export const buildScore = (score: number, explanation: string): ScoreExplanation => ({
  score: clamp01(score),
  explanation,
})

export const computeDecisionScore = (params: {
  valueConflict: number
  patternRepetition: number
  emotionalImpulse: number
  financialStrain: number
  longTermUtility: number
  emotionalSupport: number
}) => {
  return (
    WEIGHTS.intercept +
    WEIGHTS.value_conflict * params.valueConflict +
    WEIGHTS.pattern_repetition * params.patternRepetition +
    WEIGHTS.emotional_impulse * params.emotionalImpulse +
    WEIGHTS.financial_strain * params.financialStrain -
    WEIGHTS.long_term_utility * params.longTermUtility -
    WEIGHTS.emotional_support * params.emotionalSupport
  )
}

export const decisionFromScore = (score: number): VerdictOutcome => {
  if (score >= 0.7) return 'skip'
  if (score >= 0.4) return 'hold'
  return 'buy'
}

export const confidenceFromScore = (score: number) => {
  const distance = Math.min(1, Math.abs(score - 0.5))
  return Math.max(0.5, Math.min(0.95, 0.95 - distance * 0.45))
}

export const computeFinancialStrain = (
  price: number | null,
  weeklyBudget: number | null,
  isImportant = false
) => {
  if (!price || !weeklyBudget || weeklyBudget <= 0) return 0
  if (!isImportant && price > weeklyBudget / 3) return 1
  return clamp01(price / weeklyBudget)
}

export const evaluatePurchaseFallback = (
  input: PurchaseInput,
  overrides?: {
    patternRepetition?: ScoreExplanation
    financialStrain?: ScoreExplanation
    vendorMatch?: VendorMatch | null
    profileContextSummary?: string
    similarPurchasesSummary?: string
    recentPurchasesSummary?: string
  }
): EvaluationResult => {
  const reasons: string[] = []
  let riskScore = 0

  if (input.price !== null) {
    if (input.price > 200) {
      riskScore += 30
      reasons.push('High price point (>$200)')
    } else if (input.price > 100) {
      riskScore += 15
      reasons.push('Moderate price point ($100-200)')
    }
  }

  const impulseCategories = ['clothing', 'fashion', 'accessories', 'gadgets', 'electronics']
  if (input.category && impulseCategories.some((c) => input.category!.toLowerCase().includes(c))) {
    riskScore += 20
    reasons.push('Category has higher impulse purchase rate')
  }

  if (!input.justification || input.justification.length < 20) {
    riskScore += 25
    reasons.push('Weak or missing justification')
  } else if (
    input.justification.toLowerCase().includes('want') &&
    !input.justification.toLowerCase().includes('need')
  ) {
    riskScore += 10
    reasons.push('Want-based rather than need-based')
  }

  const impulseKeywords = ['limited', 'sale', 'deal', 'exclusive', 'last chance', 'flash']
  if (impulseKeywords.some((kw) => input.title.toLowerCase().includes(kw))) {
    riskScore += 20
    reasons.push('Title contains urgency/scarcity language')
  }

  const vendorRubric = getVendorRubricInfo(overrides?.vendorMatch)
  if (overrides?.vendorMatch && vendorRubric) {
    const tierRisk = PRICE_TIER_RISK_POINTS[overrides.vendorMatch.vendor_price_tier]
    if (tierRisk > 0) {
      riskScore += tierRisk
      reasons.push(`Vendor price tier: ${overrides.vendorMatch.vendor_price_tier}`)
    }
  }

  const normalizedRisk = clamp01(riskScore / 100)
  const valueConflict = buildScore(normalizedRisk * 0.6, 'Fallback heuristic.')
  const emotionalImpulse = buildScore(normalizedRisk * 0.7, 'Fallback heuristic.')
  const longTermUtility =
    buildVendorUtilityScore(overrides?.vendorMatch) ??
    buildScore(0.4, 'Fallback heuristic.')
  const emotionalSupport = buildScore(0.4, 'Fallback heuristic.')
  const patternRepetition =
    overrides?.patternRepetition ??
    buildScore(0, 'No history analysis in fallback.')
  const financialStrain =
    overrides?.financialStrain ??
    buildScore(0, 'No budget context in fallback.')

  const decisionScore = computeDecisionScore({
    valueConflict: valueConflict.score,
    patternRepetition: patternRepetition.score,
    emotionalImpulse: emotionalImpulse.score,
    financialStrain: financialStrain.score,
    longTermUtility: longTermUtility.score,
    emotionalSupport: emotionalSupport.score,
  })

  const rationaleParts = [
    summarizeProfileContext(overrides?.profileContextSummary),
    summarizePurchaseProfile(
      overrides?.similarPurchasesSummary,
      overrides?.recentPurchasesSummary
    ),
    summarizeVendorMatch(overrides?.vendorMatch),
    summarizeRiskSignals(reasons, patternRepetition, financialStrain),
  ].filter(Boolean)

  const rationale =
    rationaleParts.length > 0
      ? rationaleParts.join(LINE_BREAK)
      : 'This recommendation leans on the purchase details because profile context is limited.'

  return {
    outcome: decisionFromScore(decisionScore),
    confidence: confidenceFromScore(decisionScore),
    reasoning: {
      valueConflict,
      patternRepetition,
      emotionalImpulse,
      financialStrain,
      longTermUtility,
      emotionalSupport,
      decisionScore,
      rationale,
      importantPurchase: input.isImportant,
    },
  }
}

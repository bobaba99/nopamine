import type { EvaluationResult, PurchaseInput, ScoreExplanation, VerdictOutcome } from './types'
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

  const normalizedRisk = clamp01(riskScore / 100)
  const valueConflict = buildScore(normalizedRisk * 0.6, 'Fallback heuristic.')
  const emotionalImpulse = buildScore(normalizedRisk * 0.7, 'Fallback heuristic.')
  const longTermUtility = buildScore(0.4, 'Fallback heuristic.')
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
      rationale: `Rule-based fallback: ${reasons.join('; ') || 'No risk factors detected'}`,
      importantPurchase: input.isImportant,
    },
  }
}

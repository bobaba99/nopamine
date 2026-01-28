import { supabase } from './supabaseClient'
import type {
  VerdictRow,
  PurchaseInput,
  EvaluationResult,
  VerdictOutcome,
  UserDecision,
  UserValueRow,
  LLMEvaluationResponse,
  UserValueType,
} from './types'
import { USER_VALUE_DESCRIPTIONS } from './types'

export async function getRecentVerdict(userId: string): Promise<VerdictRow | null> {
  const { data, error } = await supabase
    .from('verdicts')
    .select(
      'id, candidate_title, candidate_price, candidate_category, candidate_vendor, justification, predicted_outcome, confidence_score, reasoning, hold_release_at, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as VerdictRow
}

export async function getVerdictHistory(
  userId: string,
  limit = 10
): Promise<VerdictRow[]> {
  const { data, error } = await supabase
    .from('verdicts')
    .select(
      'id, candidate_title, candidate_price, candidate_category, candidate_vendor, justification, predicted_outcome, confidence_score, reasoning, created_at, hold_release_at, user_proceeded, actual_outcome, user_decision, user_hold_until'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as VerdictRow[]
}

export async function updateVerdictDecision(
  userId: string,
  verdictId: string,
  decision: UserDecision
): Promise<{ error: string | null }> {
  const userHoldUntil =
    decision === 'hold'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null

  // Fetch verdict details (needed for creating purchases)
  const { data: verdict, error: fetchError } = await supabase
    .from('verdicts')
    .select('candidate_title, candidate_price, candidate_category, candidate_vendor, user_decision')
    .eq('id', verdictId)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    return { error: fetchError.message }
  }

  const previousDecision = verdict.user_decision

  // If changing FROM 'bought' to something else, remove the linked purchase
  if (previousDecision === 'bought' && decision !== 'bought') {
    const { error: deleteError } = await supabase
      .from('purchases')
      .delete()
      .eq('verdict_id', verdictId)

    if (deleteError) {
      return { error: deleteError.message }
    }
  }

  // If marking as 'bought', create purchase from verdict details
  if (decision === 'bought' && previousDecision !== 'bought') {
    const { error: purchaseError } = await supabase.rpc('add_purchase', {
      p_title: verdict.candidate_title,
      p_price: verdict.candidate_price ?? 0,
      p_vendor: verdict.candidate_vendor,
      p_category: verdict.candidate_category,
      p_purchase_date: new Date().toISOString().split('T')[0],
      p_source: 'verdict',
      p_verdict_id: verdictId,
    })

    if (purchaseError) {
      return { error: purchaseError.message }
    }
  }

  const { error } = await supabase
    .from('verdicts')
    .update({
      user_decision: decision,
      user_hold_until: userHoldUntil,
    })
    .eq('id', verdictId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}

export async function deleteVerdict(
  userId: string,
  verdictId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('verdicts')
    .delete()
    .eq('id', verdictId)
    .eq('user_id', userId)

  return { error: error?.message ?? null }
}

export async function createVerdict(
  userId: string,
  input: PurchaseInput,
  evaluation: EvaluationResult
): Promise<{ error: string | null }> {
  const holdReleaseAt =
    evaluation.outcome === 'hold'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null

  const { error } = await supabase.from('verdicts').insert({
    user_id: userId,
    candidate_title: input.title,
    candidate_price: input.price,
    candidate_category: input.category,
    candidate_vendor: input.vendor,
    justification: input.justification,
    predicted_outcome: evaluation.outcome,
    confidence_score: evaluation.confidence,
    reasoning: evaluation.reasoning,
    hold_release_at: holdReleaseAt,
  })

  return { error: error?.message ?? null }
}

type PurchaseWithSwipe = {
  id: string
  title: string
  price: number
  category: string | null
  vendor: string | null
  purchase_date: string
  verdict_id: string | null
  swipes: { outcome: string }[]
  verdicts: { justification: string | null } | null
}

function formatPurchaseString(purchase: PurchaseWithSwipe): string {
  const outcome = purchase.swipes?.[0]?.outcome ?? 'not rated'
  const motive = purchase.verdicts?.justification
  const parts = [
    `- ${purchase.title}`,
    `$${Number(purchase.price).toFixed(2)}`,
    purchase.category ?? 'uncategorized',
    purchase.vendor ?? 'unknown vendor',
    outcome,
  ]
  if (motive) {
    parts.push(`"${motive}"`)
  }
  return parts.join(' | ')
}

/**
 * Retrieve similar purchases based on same category
 * Returns formatted string for LLM context
 */
export async function retrieveSimilarPurchases(
  userId: string,
  input: PurchaseInput,
  limit = 5
): Promise<string> {
  if (!input.category) {
    return 'No category specified for comparison.'
  }

  const { data, error } = await supabase
    .from('purchases')
    .select(
      `
      id, title, price, category, vendor, purchase_date, verdict_id,
      swipes (outcome),
      verdicts (justification)
    `
    )
    .eq('user_id', userId)
    .eq('category', input.category)
    .order('purchase_date', { ascending: false })
    .limit(limit)

  if (error || !data || data.length === 0) {
    return 'No similar purchases found.'
  }

  const purchases = data as unknown as PurchaseWithSwipe[]
  const lines = purchases.map(formatPurchaseString)
  return `Similar purchases in "${input.category}":\n${lines.join('\n')}`
}

/**
 * Retrieve most recent purchases regardless of category
 * Returns formatted string for LLM context
 */
export async function retrieveRecentPurchases(userId: string, limit = 5): Promise<string> {
  const { data, error } = await supabase
    .from('purchases')
    .select(
      `
      id, title, price, category, vendor, purchase_date, verdict_id,
      swipes (outcome),
      verdicts (justification)
    `
    )
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false })
    .limit(limit)

  if (error || !data || data.length === 0) {
    return 'No purchase history found.'
  }

  const purchases = data as unknown as PurchaseWithSwipe[]
  const lines = purchases.map(formatPurchaseString)
  return `Recent purchases:\n${lines.join('\n')}`
}

/**
 * Retrieve user values formatted for LLM context
 */
export async function retrieveUserValues(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_values')
    .select('value_type, preference_score')
    .eq('user_id', userId)

  if (error || !data || data.length === 0) {
    return 'No user values set.'
  }

  const lines = data.map((v: { value_type: string; preference_score: number | null }) => {
    const description = USER_VALUE_DESCRIPTIONS[v.value_type as UserValueType] ?? v.value_type
    return `- ${v.value_type} (${v.preference_score}/5): "${description}"`
  })

  return `User values:\n${lines.join('\n')}`
}

/**
 * Build the system prompt for LLM evaluation
 */
function buildSystemPrompt(): string {
  return `Role: You are a purchase evaluator. Your responsibility is to identify unnecessary and risky purchases according to user's values and past purchase history. You will generate a verdict from these three options: buy, hold, and skip.

User values are rated 1-5, where higher scores indicate stronger importance:
- Durability: "I value things that last several years."
- Efficiency: "I value tools that save time for me."
- Aesthetics: "I value items that fit my existing environment's visual language."
- Interpersonal Value: "I value purchases that facilitate shared experiences."
- Emotional Value: "I value purchases that provide meaningful emotional benefits."

You must respond with valid JSON only, no other text.`
}

/**
 * Build the user prompt for LLM evaluation
 */
function buildUserPrompt(
  input: PurchaseInput,
  userValues: string,
  similarPurchases: string,
  recentPurchases: string
): string {
  return `${userValues}

${similarPurchases}

${recentPurchases}

Now evaluate this purchase:
- Item: ${input.title}
- Price: ${input.price !== null ? `$${input.price.toFixed(2)}` : 'Not specified'}
- Category: ${input.category ?? 'Uncategorized'}
- Vendor: ${input.vendor ?? 'Not specified'}
- User rationale: "${input.justification ?? 'No rationale provided'}"

Output the final verdict and scoring in this exact JSON format:
{
  "value_conflict_score": {
    "score": <number 0-5>,
    "explanation": "<brief explanation>"
  },
  "pattern_repetition_risk": {
    "score": <number 0-5>,
    "explanation": "<brief explanation>"
  },
  "final_verdict": {
    "decision": "<buy|hold|skip>",
    "rationale": "<2-3 sentence rationale>"
  }
}`
}

/**
 * Parse LLM response into EvaluationResult
 */
function parseLLMResponse(response: LLMEvaluationResponse): EvaluationResult {
  const { value_conflict_score, pattern_repetition_risk, final_verdict } = response

  // Calculate confidence from scores (lower conflict/risk = higher confidence)
  const conflictPenalty = value_conflict_score.score / 5 // 0-1
  const riskPenalty = pattern_repetition_risk.score // 0-1
  const confidence = Math.max(0.5, Math.min(0.95, 1 - (conflictPenalty + riskPenalty) / 2))

  return {
    outcome: final_verdict.decision as VerdictOutcome,
    confidence,
    reasoning: {
      valueConflictScore: {
        score: value_conflict_score.score,
        explanation: value_conflict_score.explanation,
      },
      patternRepetitionRisk: {
        score: pattern_repetition_risk.score,
        explanation: pattern_repetition_risk.explanation,
      },
      rationale: final_verdict.rationale,
    },
  }
}

/**
 * Fallback rule-based evaluation (used when LLM fails)
 */
function evaluatePurchaseFallback(input: PurchaseInput): EvaluationResult {
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

  let outcome: VerdictOutcome
  if (riskScore >= 50) {
    outcome = 'skip'
  } else if (riskScore >= 25) {
    outcome = 'hold'
  } else {
    outcome = 'buy'
  }

  const confidence = Math.max(0.5, Math.min(0.95, 1 - riskScore / 150))

  return {
    outcome,
    confidence,
    reasoning: {
      valueConflictScore: { score: 0, explanation: 'Fallback evaluation - no LLM analysis' },
      patternRepetitionRisk: { score: 0, explanation: 'Fallback evaluation - no history analysis' },
      rationale: `Rule-based evaluation: ${reasons.join('; ') || 'No risk factors detected'}`,
    },
  }
}

/**
 * Evaluate a purchase using LLM with user context
 * Falls back to rule-based evaluation if LLM fails
 */
export async function evaluatePurchase(
  userId: string,
  input: PurchaseInput,
  openaiApiKey?: string
): Promise<EvaluationResult> {
  // If no API key, use fallback
  if (!openaiApiKey) {
    console.warn('No OpenAI API key provided, using fallback evaluation')
    return evaluatePurchaseFallback(input)
  }

  try {
    // Gather context in parallel
    const [userValues, similarPurchases, recentPurchases] = await Promise.all([
      retrieveUserValues(userId),
      retrieveSimilarPurchases(userId, input, 5),
      retrieveRecentPurchases(userId, 5),
    ])

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(input, userValues, similarPurchases, recentPurchases)

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in LLM response')
    }

    // Parse JSON response
    const llmResponse = JSON.parse(content) as LLMEvaluationResponse
    return parseLLMResponse(llmResponse)
  } catch (error) {
    console.error('LLM evaluation failed, using fallback:', error)
    return evaluatePurchaseFallback(input)
  }
}

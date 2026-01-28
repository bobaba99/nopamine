// Shared types for database rows and API responses

export type SwipeOutcome = 'satisfied' | 'regret'

export type SwipeTiming = 'immediate' | 'week' | 'month3' | 'month6'

export type VerdictOutcome = 'buy' | 'hold' | 'skip'

export type UserDecision = 'bought' | 'hold' | 'skip'

export type PurchaseRow = {
  id: string
  title: string
  price: number
  vendor: string | null
  category: string | null
  purchase_date: string
  source?: string | null
  verdict_id?: string | null
  created_at?: string | null
}

export type SwipeRow = {
  id: string
  user_id: string
  purchase_id: string
  schedule_id?: string | null
  timing?: SwipeTiming | null
  outcome: SwipeOutcome
  created_at: string
}

export type SwipeScheduleRow = {
  id: string
  user_id: string
  purchase_id: string
  timing: SwipeTiming
  scheduled_for: string
  completed_at: string | null
  created_at: string
}

export type SwipeQueueItem = {
  schedule_id: string
  timing: SwipeTiming
  scheduled_for: string
  purchase: PurchaseRow
}

export type VerdictRow = {
  id: string
  candidate_title: string
  candidate_price: number | null
  candidate_category?: string | null
  candidate_vendor?: string | null
  justification?: string | null
  predicted_outcome: VerdictOutcome | null
  reasoning?: Record<string, unknown> | null
  hold_release_at: string | null
  user_proceeded?: boolean | null
  actual_outcome?: string | null
  user_decision?: UserDecision | null
  user_hold_until?: string | null
  created_at: string | null
}

export type UserRow = {
  id: string
  email: string
  created_at: string | null
  last_active: string | null
  onboarding_completed: boolean | null
}

export type UserValueRow = {
  id: string
  value_type: string
  preference_score: number | null
  created_at: string | null
}

export type Stats = {
  swipesCompleted: number
  regretRate: number
  activeHolds: number
}

export type PurchaseInput = {
  title: string
  price: number | null
  category: string | null
  vendor: string | null
  justification: string | null
}

export type EvaluationResult = {
  outcome: VerdictOutcome
  confidence: number
  reasoning: LLMEvaluationReasoning
}

// LLM evaluation response types (matches evaluate_logic_v2.md schema)
export type LLMEvaluationReasoning = {
  valueConflictScore: ValueConflictScore
  patternRepetitionRisk: PatternRepetitionRisk
  rationale: string
}

export type ValueConflictScore = {
  score: number // 0-5: 0 = no conflict, 5 = direct contradiction
  explanation: string
}

export type PatternRepetitionRisk = {
  score: number // 0-5: 0 = no similarity to regrets, 5 = highly risky
  explanation: string
}

// Raw LLM response format (for parsing)
export type LLMEvaluationResponse = {
  value_conflict_score: {
    score: number
    explanation: string
  }
  pattern_repetition_risk: {
    score: number
    explanation: string
  }
  final_verdict: {
    decision: 'buy' | 'hold' | 'skip'
    rationale: string
  }
}

// User value types matching database enum
export type UserValueType =
  | 'durability'
  | 'efficiency'
  | 'aesthetics'
  | 'interpersonal_value'
  | 'emotional_value'

export const USER_VALUE_DESCRIPTIONS: Record<UserValueType, string> = {
  durability: 'I value things that last several years.',
  efficiency: 'I value tools that save time for me.',
  aesthetics: "I value items that fit my existing environment's visual language.",
  interpersonal_value: 'I value purchases that facilitate shared experiences.',
  emotional_value: 'I value purchases that provide meaningful emotional benefits.',
}

export const PURCHASE_CATEGORIES = [
  { value: 'uncategorized', label: 'Uncategorized' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'home_goods', label: 'Home goods' },
  { value: 'health_wellness', label: 'Health & wellness' },
  { value: 'travel', label: 'Travel' },
  { value: 'experiences', label: 'Experiences' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'food_beverage', label: 'Food & beverage' },
  { value: 'services', label: 'Services' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
] as const

export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number]['value']

import { supabase } from '../core/supabaseClient'
import type { VerdictRow, SharedVerdictRow, LLMEvaluationReasoning } from '../core/types'
import { logger } from '../core/logger'

const SHARE_TOKEN_LENGTH = 10

const generateShareToken = (): string =>
  crypto.randomUUID().replace(/-/g, '').slice(0, SHARE_TOKEN_LENGTH)

const stripHtmlTags = (html: string): string =>
  html.replace(/<[^>]*>/g, '').trim()

const extractRationaleSummary = (reasoning: Record<string, unknown> | null | undefined): string | null => {
  if (!reasoning) return null
  const typed = reasoning as LLMEvaluationReasoning
  if (typed.rationaleOneLiner) return typed.rationaleOneLiner
  const raw = typed.rationale
  if (!raw) return null
  const plain = stripHtmlTags(raw)
  return plain.length > 120 ? `${plain.slice(0, 117)}...` : plain
}

const extractDecisionScore = (reasoning: Record<string, unknown> | null | undefined): number | null => {
  if (!reasoning) return null
  const typed = reasoning as LLMEvaluationReasoning
  return typeof typed.decisionScore === 'number' ? typed.decisionScore : null
}

export const getExistingShareToken = async (
  verdictId: string,
  userId: string,
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('shared_verdicts')
    .select('share_token')
    .eq('verdict_id', verdictId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    logger.warn('Failed to check existing share token', { verdictId, error: error.message })
    return null
  }

  return data?.share_token ?? null
}

export const createSharedVerdict = async (
  verdict: VerdictRow,
  userId: string,
): Promise<{ token: string | null; error: string | null }> => {
  try {
    const existing = await getExistingShareToken(verdict.id, userId)
    if (existing) {
      return { token: existing, error: null }
    }

    const token = generateShareToken()
    const { error } = await supabase.from('shared_verdicts').insert({
      verdict_id: verdict.id,
      user_id: userId,
      share_token: token,
      candidate_title: verdict.candidate_title,
      candidate_price: verdict.candidate_price,
      candidate_vendor: verdict.candidate_vendor ?? null,
      candidate_category: verdict.candidate_category ?? null,
      predicted_outcome: verdict.predicted_outcome,
      rationale_summary: extractRationaleSummary(verdict.reasoning),
      decision_score: extractDecisionScore(verdict.reasoning),
    })

    if (error) {
      logger.error('Failed to create shared verdict', { error: error.message })
      return { token: null, error: 'Could not create share link' }
    }

    return { token, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('createSharedVerdict threw', { error: message })
    return { token: null, error: 'Could not create share link' }
  }
}

export const getSharedVerdict = async (token: string): Promise<SharedVerdictRow | null> => {
  const { data, error } = await supabase
    .from('shared_verdicts')
    .select('*')
    .eq('share_token', token)
    .maybeSingle()

  if (error) {
    logger.warn('Failed to fetch shared verdict', { token, error: error.message })
    return null
  }

  return data as SharedVerdictRow | null
}

export const incrementShareViewCount = async (token: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_share_view_count', { p_token: token })
  if (error) {
    logger.warn('Failed to increment share view count', { token, error: error.message })
  }
}

export const buildShareUrl = (token: string): string =>
  `${window.location.origin}/shared/${token}`

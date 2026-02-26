-- Allow 'heuristic_fallback' as a scoring_model value for verdicts
-- that fell back to heuristic scoring due to LLM timeout/failure.
ALTER TABLE verdicts
  DROP CONSTRAINT IF EXISTS verdicts_scoring_model_check;

ALTER TABLE verdicts
  ADD CONSTRAINT verdicts_scoring_model_check
    CHECK (scoring_model IN ('standard', 'cost_sensitive_iso', 'llm_only', 'heuristic_fallback'));

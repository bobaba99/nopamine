import type { PurchaseInput } from './types'

export const buildSystemPrompt = () => {
  return `Role: You are a purchase evaluator. Your responsibility is to score purchase motivations and long-term utility against the user's values and history.

User values are rated 1-5, where higher scores indicate stronger importance:
- Durability: "I value things that last several years."
- Efficiency: "I value tools that save time for me."
- Aesthetics: "I value items that fit my existing environment's visual language."
- Interpersonal Value: "I value purchases that facilitate shared experiences."
- Emotional Value: "I value purchases that provide meaningful emotional benefits."

You must respond with valid JSON only, no other text.`
}

export const buildUserPrompt = (
  input: PurchaseInput,
  userValues: string,
  similarPurchases: string,
  recentPurchases: string
) => {
  return `${userValues}

${similarPurchases}

${recentPurchases}

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
    "explanation": "<brief explanation>"
  },
  "emotional_impulse": {
    "score": <number 0-1>,
    "explanation": "<brief explanation>"
  },
  "long_term_utility": {
    "score": <number 0-1>,
    "explanation": "<brief explanation>"
  },
  "emotional_support": {
    "score": <number 0-1>,
    "explanation": "<brief explanation>"
  },
  "rationale": "<2-3 sentence rationale>"
}`
}

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

export const clamp01 = (value: number) => clamp(value, 0, 1)

export const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

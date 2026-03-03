import { supabase } from '../core/supabaseClient'

type EmbeddingResponse = {
  data: { embedding: number[] }[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const getAuthToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No active session')
  }
  return session.access_token
}

export const getEmbeddings = async (
  inputs: string[]
): Promise<number[][]> => {
  const token = await getAuthToken()

  const response = await fetch(`${API_BASE_URL}/api/embeddings/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ inputs }),
  })

  if (!response.ok) {
    throw new Error(`Embeddings API error: ${response.status}`)
  }

  const data = (await response.json()) as EmbeddingResponse
  return data.data.map((item) => item.embedding)
}

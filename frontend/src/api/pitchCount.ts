import client from './client'
import type { PitchCount } from '@/models/pitch_count'
import type { PitchCountFormData } from '@/types'

export async function createPitchCount(
  data: PitchCountFormData
): Promise<PitchCount> {
  const res = await client.post<{ success: true; data: PitchCount }>(
    "/pitch-count/",
    data
  )
  return res.data.data
}
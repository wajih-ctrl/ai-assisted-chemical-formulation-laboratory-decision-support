import type { Metadata } from 'next'
import { RecommendationsView } from '@/components/lab/recommendations-view'

export const metadata: Metadata = { title: 'Next-Test Recommendations' }

export default function RecommendationsPage() {
  return <RecommendationsView />
}

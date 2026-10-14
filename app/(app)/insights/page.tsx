import type { Metadata } from 'next'
import { InsightsView } from '@/components/lab/insights-view'

export const metadata: Metadata = { title: 'AI Insights' }

export default function InsightsPage() {
  return <InsightsView />
}

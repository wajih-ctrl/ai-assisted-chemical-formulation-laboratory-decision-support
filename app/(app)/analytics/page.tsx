import type { Metadata } from 'next'
import { AnalyticsView } from '@/components/lab/analytics-view'

export const metadata: Metadata = { title: 'Performance Analytics' }

export default function AnalyticsPage() {
  return <AnalyticsView />
}

import type { Metadata } from 'next'
import { AnalysisView } from '@/components/lab/analysis-view'

export const metadata: Metadata = { title: 'Bottle-Test Analysis' }

export default function DemulsifierAnalysisPage() {
  return <AnalysisView />
}

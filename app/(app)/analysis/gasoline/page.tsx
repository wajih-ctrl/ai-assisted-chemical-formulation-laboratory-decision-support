import type { Metadata } from 'next'
import { GasolineView } from '@/components/lab/gasoline-view'

export const metadata: Metadata = { title: 'Gasoline Blend Screening' }

export default function GasolineAnalysisPage() {
  return <GasolineView />
}

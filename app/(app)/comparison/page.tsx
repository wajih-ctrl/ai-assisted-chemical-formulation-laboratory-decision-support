import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ComparisonView } from '@/components/lab/comparison-view'

export const metadata: Metadata = { title: 'Formulation Comparison' }

export default function ComparisonPage() {
  return (
    <Suspense fallback={null}>
      <ComparisonView />
    </Suspense>
  )
}

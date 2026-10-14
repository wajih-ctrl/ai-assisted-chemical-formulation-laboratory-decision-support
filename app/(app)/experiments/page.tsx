import type { Metadata } from 'next'
import { ExperimentsView } from '@/components/lab/experiments-view'

export const metadata: Metadata = { title: 'Experiments' }

export default function ExperimentsPage() {
  return <ExperimentsView />
}

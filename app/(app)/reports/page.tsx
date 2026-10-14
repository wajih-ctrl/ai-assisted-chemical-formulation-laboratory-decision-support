import type { Metadata } from 'next'
import { ReportsView } from '@/components/lab/reports-view'

export const metadata: Metadata = { title: 'Report Builder' }

export default function ReportsPage() {
  return <ReportsView />
}

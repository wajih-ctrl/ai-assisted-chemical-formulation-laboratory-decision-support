import type { Metadata } from 'next'
import { WorkflowsView } from '@/components/lab/workflows-view'

export const metadata: Metadata = { title: 'Workflows' }

export default function WorkflowsPage() {
  return <WorkflowsView />
}

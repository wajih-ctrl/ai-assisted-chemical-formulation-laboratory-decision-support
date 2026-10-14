import type { Metadata } from 'next'
import { TestingPlanView } from '@/components/lab/testing-plan-view'

export const metadata: Metadata = { title: 'Testing Plan' }

export default function TestingPlanPage() {
  return <TestingPlanView />
}

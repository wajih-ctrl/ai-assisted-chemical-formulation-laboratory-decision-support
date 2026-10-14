import type { Metadata } from 'next'
import { ExperimentForm } from '@/components/lab/experiment-form'

export const metadata: Metadata = { title: 'Add experiment' }

export default async function NewExperimentPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  return <ExperimentForm key={edit ?? 'new'} editId={edit} />
}

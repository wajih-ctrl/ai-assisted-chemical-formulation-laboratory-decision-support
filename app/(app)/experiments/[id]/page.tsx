import type { Metadata } from 'next'
import { ExperimentDetail } from '@/components/lab/experiment-detail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Experiment ${decodeURIComponent(id)}` }
}

export default async function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExperimentDetail id={decodeURIComponent(id)} />
}

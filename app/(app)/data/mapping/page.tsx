import type { Metadata } from 'next'
import { MappingView } from '@/components/lab/mapping-view'

export const metadata: Metadata = { title: 'Preview & Map Columns' }

export default function MappingPage() {
  return <MappingView />
}

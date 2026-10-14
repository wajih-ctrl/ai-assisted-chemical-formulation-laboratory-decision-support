import type { Metadata } from 'next'
import { UploadView } from '@/components/lab/upload-view'

export const metadata: Metadata = { title: 'Import Historical Data' }

export default function UploadPage() {
  return <UploadView />
}

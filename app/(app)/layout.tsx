import { AppShell } from '@/components/lab/app-shell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}

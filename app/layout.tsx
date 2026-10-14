import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import { StoreProvider } from '@/lib/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'StrataLab: Chemical Experiment Intelligence',
    template: '%s · StrataLab',
  },
  description:
    'Review historical chemical experiments, compare formulations, understand coverage gaps and plan the next laboratory tests. Prototype with illustrative demo data.',
}

export const viewport: Viewport = {
  themeColor: '#142236',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} bg-background`}>
      <body className="min-h-svh font-sans antialiased">
        <TooltipProvider delay={150}>
          <StoreProvider>{children}</StoreProvider>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}

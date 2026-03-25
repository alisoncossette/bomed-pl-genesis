import type { Metadata, Viewport } from 'next'
import { MiniKitProvider } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'BoMed — Patient Portal',
  description: 'Manage your healthcare permissions with World ID verification',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#08090d',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#08090d]">
        <MiniKitProvider>{children}</MiniKitProvider>
      </body>
    </html>
  )
}

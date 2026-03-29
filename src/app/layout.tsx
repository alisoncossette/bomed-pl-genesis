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
      <body className="min-h-screen bg-[#141440]">
        <div className="min-h-screen flex justify-center bg-[#e5e7eb]">
          <div className="w-full max-w-[430px] min-h-screen bg-white shadow-2xl relative overflow-hidden">
            <MiniKitProvider>{children}</MiniKitProvider>
          </div>
        </div>
      </body>
    </html>
  )
}

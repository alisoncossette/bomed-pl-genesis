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
      <body className="min-h-screen bg-[#1a1a2e]">
        {/* Desktop: phone frame */}
        <div className="hidden sm:flex min-h-screen items-center justify-center py-8"
          style={{ background: 'radial-gradient(ellipse at center, #1e2154 0%, #0d0d1a 100%)' }}>
          {/* Phone shell */}
          <div className="relative flex-shrink-0" style={{ width: 390, height: 844 }}>
            {/* Outer phone body */}
            <div className="absolute inset-0 rounded-[52px] shadow-[0_40px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden"
              style={{ background: '#1a1a1a' }}>
              {/* Side buttons */}
              <div className="absolute -left-[3px] top-[120px] w-[3px] h-[36px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[170px] w-[3px] h-[64px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[248px] w-[3px] h-[64px] bg-[#2a2a2a] rounded-l-sm" />
              <div className="absolute -right-[3px] top-[160px] w-[3px] h-[80px] bg-[#2a2a2a] rounded-r-sm" />
              {/* Screen bezel */}
              <div className="absolute inset-[4px] rounded-[48px] overflow-hidden bg-white">
                {/* Status bar notch */}
                <div className="relative bg-white h-[50px] flex items-center justify-between px-6 flex-shrink-0">
                  <span className="text-[13px] font-semibold text-[#02043d]">9:41</span>
                  <div className="absolute left-1/2 -translate-x-1/2 top-[8px] w-[120px] h-[34px] bg-black rounded-full" />
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-3" viewBox="0 0 16 12" fill="#02043d">
                      <rect x="0" y="3" width="3" height="9" rx="0.5" opacity="0.4"/>
                      <rect x="4.5" y="2" width="3" height="10" rx="0.5" opacity="0.6"/>
                      <rect x="9" y="0.5" width="3" height="11.5" rx="0.5" opacity="0.8"/>
                      <rect x="13.5" y="0" width="2.5" height="12" rx="0.5"/>
                    </svg>
                    <svg className="w-4 h-3" viewBox="0 0 16 12" fill="#02043d">
                      <path d="M8 2.5C10.5 2.5 12.7 3.5 14.3 5.1L15.5 3.9C13.6 2 11 1 8 1C5 1 2.4 2 0.5 3.9L1.7 5.1C3.3 3.5 5.5 2.5 8 2.5Z" opacity="0.4"/>
                      <path d="M8 5C9.7 5 11.2 5.7 12.3 6.8L13.5 5.6C12.1 4.2 10.1 3.3 8 3.3C5.9 3.3 3.9 4.2 2.5 5.6L3.7 6.8C4.8 5.7 6.3 5 8 5Z" opacity="0.7"/>
                      <circle cx="8" cy="10" r="1.5"/>
                    </svg>
                    <div className="flex items-center gap-0.5">
                      <div className="w-6 h-3 rounded-sm border border-[#02043d] flex items-center px-0.5">
                        <div className="h-1.5 bg-[#02043d] rounded-sm" style={{width: '70%'}} />
                      </div>
                      <div className="w-0.5 h-1.5 bg-[#02043d] rounded-sm opacity-50" />
                    </div>
                  </div>
                </div>
                {/* App content — scrollable */}
                <div className="overflow-y-auto" style={{ height: 'calc(844px - 8px - 50px - 34px)' }}>
                  <MiniKitProvider>{children}</MiniKitProvider>
                </div>
                {/* Home indicator */}
                <div className="h-[34px] bg-white flex items-center justify-center">
                  <div className="w-[134px] h-[5px] bg-[#02043d] rounded-full opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile: full screen as normal */}
        <div className="sm:hidden min-h-screen bg-white">
          <MiniKitProvider>{children}</MiniKitProvider>
        </div>
      </body>
    </html>
  )
}

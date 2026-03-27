'use client'

import { useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'

export default function PracticeQRPage() {
  const params = useParams()
  const handle = params.handle as string
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const practiceName = handle === 'greenfieldpt' ? 'Greenfield PT' : handle
  const scopes = 'appointments:read,appointments:book,patients:read'
  const qrUrl = `https://world.bomed.ai?practice=${handle}&scopes=${scopes}`

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrUrl,
        {
          width: 400,
          margin: 2,
          color: {
            dark: '#02043d',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR Code generation error:', error)
        }
      )
    }
  }, [qrUrl])

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header - hide on print */}
      <header className="bg-white border-b border-[#e5e7eb] shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/practice/${handle}`}
              className="flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#02043d] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#0d9488] text-white text-sm font-semibold rounded-lg hover:bg-[#0f766e] transition-colors"
            >
              Print QR Code
            </button>
          </div>
        </div>
      </header>

      {/* QR Code Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          {/* Practice info */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0d9488] to-[#14b8a6] rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg print:shadow-none">
              🏥
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#02043d]">{practiceName}</h1>
              <p className="text-base text-[#6b7280] mt-1">Patient Access Portal</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white border-4 border-[#02043d] rounded-2xl p-8 shadow-2xl print:shadow-none print:border-2">
            <canvas ref={canvasRef} className="block" />
          </div>

          {/* Instructions */}
          <div className="text-center max-w-md">
            <p className="text-lg font-semibold text-[#02043d] mb-2">
              Scan with World App to connect
            </p>
            <p className="text-sm text-[#6b7280] leading-relaxed">
              Patients scan this QR code with the BoMed World App to securely share their health data with {practiceName}
            </p>
          </div>

          {/* Scopes info */}
          <div className="w-full max-w-md bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-5">
            <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
              Requested Permissions
            </p>
            <div className="flex flex-col gap-2">
              {scopes.split(',').map(scope => (
                <div key={scope} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0d9488]" />
                  <span className="text-sm text-[#02043d]">
                    {scope.replace(/:/g, ' - ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* URL for manual entry (small, print-only) */}
          <div className="hidden print:block text-center">
            <p className="text-xs text-[#9ca3af] font-mono break-all">{qrUrl}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 1in;
            size: portrait;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          header,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </main>
  )
}

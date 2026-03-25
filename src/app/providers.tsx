'use client'

import { MiniKit } from '@worldcoin/minikit-js'
import { ReactNode, useEffect } from 'react'

export function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    MiniKit.install(process.env.NEXT_PUBLIC_WORLD_APP_ID)
  }, [])

  return <>{children}</>
}

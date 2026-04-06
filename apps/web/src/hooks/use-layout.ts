import { createContext, useContext } from 'react'

export type LayoutContextValue = {
  chrome: boolean
  setChrome: (visible: boolean) => void
}

export const LayoutContext = createContext<LayoutContextValue | null>(null)

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within Layout')
  return ctx
}

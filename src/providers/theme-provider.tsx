import { createContext, useContext, useEffect, useMemo } from 'react'
import { useTheme as useThemeStore } from '@/hooks/useTheme'

type Theme = 'light' | 'dark'

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

/** Menyelesaikan temuan #4 — sinkronkan class `dark` ke <html> via Zustand persist */
export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  useEffect(() => {
    if (!theme && defaultTheme) {
      setTheme(defaultTheme)
    }
  }, [defaultTheme, setTheme, theme])

  const value = useMemo(
    () => ({ theme: theme || defaultTheme, setTheme, toggleTheme }),
    [theme, defaultTheme, setTheme, toggleTheme],
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

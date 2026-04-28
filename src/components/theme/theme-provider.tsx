import * as React from "react"

import {
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from "@/components/theme/theme-context"

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme
  return getSystemTheme()
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.dataset.theme = theme
}

type ThemeProviderProps = {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme)

  React.useLayoutEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

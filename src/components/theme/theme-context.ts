import * as React from "react"

export type Theme = "light" | "dark"

export type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const THEME_STORAGE_KEY = "bazeoffice:theme"
export const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.")
  }
  return context
}

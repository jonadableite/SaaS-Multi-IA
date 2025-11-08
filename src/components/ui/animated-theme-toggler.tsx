'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/utils/cn'

interface AnimatedThemeTogglerProps {
  className?: string
  duration?: number
}

export function AnimatedThemeToggler({
  className,
  duration = 400,
}: AnimatedThemeTogglerProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          className,
        )}
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    
    // Add transition animation
    document.documentElement.style.setProperty('view-transition-name', 'theme-toggle')
    
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // @ts-ignore - startViewTransition is experimental
      document.startViewTransition(() => {
        setTheme(newTheme)
      })
    } else {
      setTheme(newTheme)
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      aria-label="Toggle theme"
      title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
    >
      <div className="relative h-4 w-4">
        <Sun
          className={cn(
            'absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-all duration-300',
            isDark && 'rotate-90 scale-0',
          )}
        />
        <Moon
          className={cn(
            'absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all duration-300',
            isDark && 'rotate-0 scale-100',
          )}
        />
      </div>
    </button>
  )
}


import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

// Sincroniza o tema do store com a classe `dark` no <html>.
// É chamado uma vez no App.
export function useTheme() {
  const tema = useStore((s) => s.tema)

  useEffect(() => {
    const root = document.documentElement
    if (tema === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [tema])

  return tema
}

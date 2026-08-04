import { useEffect, useState } from 'react'

/** Debounce genérico para busca em listagens (placa, modelo, etc.). */
export function useDebounce<T>(valor: T, delayMs = 250): T {
  const [val, setVal] = useState(valor)
  useEffect(() => {
    const t = window.setTimeout(() => setVal(valor), delayMs)
    return () => window.clearTimeout(t)
  }, [valor, delayMs])
  return val
}

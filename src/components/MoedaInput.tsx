import { useEffect, useState, type InputHTMLAttributes } from 'react'

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /** Valor numérico (em reais — ex.: 12345.67). */
  value: number
  onChange: (valor: number) => void
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatar(valor: number): string {
  if (!isFinite(valor)) return brl.format(0)
  return brl.format(valor)
}

function parseDigitos(texto: string): number {
  const digitos = texto.replace(/\D/g, '')
  if (!digitos) return 0
  return parseInt(digitos, 10) / 100
}

/**
 * Input de moeda BRL: usuário digita números, exibimos máscara R$ X.XXX,XX
 * automaticamente. O onChange entrega sempre um number.
 */
export function MoedaInput({ value, onChange, className = '', ...rest }: Props) {
  const [texto, setTexto] = useState<string>(() => formatar(value))

  // Mantém o display sincronizado quando o valor externo muda.
  useEffect(() => {
    setTexto(formatar(value))
  }, [value])

  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      className={['input tabular', className].join(' ')}
      value={texto}
      onChange={(e) => {
        const novoNumero = parseDigitos(e.target.value)
        setTexto(formatar(novoNumero))
        onChange(novoNumero)
      }}
      {...rest}
    />
  )
}

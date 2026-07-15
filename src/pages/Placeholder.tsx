import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'

interface Props {
  titulo: string
  descricao?: string
  icone?: ReactNode
}

// Placeholder reutilizável para módulos ainda não implementados.
export function Placeholder({ titulo, descricao, icone }: Props) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
        {icone ?? <Construction size={28} />}
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {descricao ??
            'Em breve. Este módulo será implementado na próxima fase do projeto.'}
        </p>
      </div>
      <span className="badge bg-primary/15 text-primary">Em breve</span>
    </section>
  )
}

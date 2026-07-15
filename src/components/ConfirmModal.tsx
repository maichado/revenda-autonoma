import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estiliza o botão principal como destrutivo. */
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

// Modal de confirmação simples (Sim/Não) reutilizável.
export function ConfirmModal({
  open,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {danger && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-500">
            <AlertTriangle size={20} />
          </span>
        )}
        <p className="text-sm text-zinc-700 dark:text-zinc-200">{message}</p>
      </div>
    </Modal>
  )
}

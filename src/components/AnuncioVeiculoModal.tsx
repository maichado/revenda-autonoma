import { useMemo } from 'react'
import type { Veiculo } from '@/types'
import { gerarTextoAnuncioVeiculo } from '@/utils/gerarAnuncio'
import { Modal } from './Modal'
import { Button } from './Button'
import { AcoesCompartilhamento } from './AcoesCompartilhamento'
import { BolhaWhatsApp } from './BolhaWhatsApp'

interface Props {
  open: boolean
  veiculo?: Veiculo
  nomeRevenda: string
  onClose: () => void
}

export function AnuncioVeiculoModal({
  open,
  veiculo,
  nomeRevenda,
  onClose,
}: Props) {
  const texto = useMemo(
    () => (veiculo ? gerarTextoAnuncioVeiculo(veiculo, nomeRevenda) : ''),
    [veiculo, nomeRevenda],
  )

  const titulo = veiculo
    ? `Anúncio — ${veiculo.marca} ${veiculo.modelo}`
    : 'Gerar anúncio'

  return (
    <Modal
      open={open && !!veiculo}
      title={titulo}
      description="Texto pronto para WhatsApp, Instagram ou marketplace. Copie e edite se quiser."
      onClose={onClose}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {veiculo && (
        <div className="space-y-4">
          <BolhaWhatsApp texto={texto} nomeRevenda={nomeRevenda} />
          <AcoesCompartilhamento
            texto={texto}
            slug={`anuncio_${veiculo.placa}`}
          />
        </div>
      )}
    </Modal>
  )
}

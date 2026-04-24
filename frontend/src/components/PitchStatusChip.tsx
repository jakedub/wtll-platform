import Chip from '@mui/material/Chip'
import type { PitchStatus } from '../types'

interface Props {
  status: PitchStatus
  size?: 'small' | 'medium'
}

const CONFIG = {
  AVAILABLE: { label: 'Available', color: '#e8f5e9', textColor: '#1b5e20', border: '#4caf50' },
  CAUTION:   { label: 'Caution',   color: '#fff8e1', textColor: '#e65100', border: '#ffa726' },
  REST:      { label: 'Rest',      color: '#ffebee', textColor: '#b71c1c', border: '#ef5350' },
}

export default function PitchStatusChip({ status, size = 'small' }: Props) {
  const cfg = CONFIG[status]
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        backgroundColor: cfg.color,
        color: cfg.textColor,
        border: `1px solid ${cfg.border}`,
        fontWeight: 700,
      }}
    />
  )
}

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import type { PlayerPitchStatus, PitchStatus } from '../types'

interface Props {
  status: PitchStatus
  pitchStatus?: PlayerPitchStatus   // if provided, enhances label and tooltip
  size?: 'small' | 'medium'
}

const CONFIG = {
  AVAILABLE: { label: 'Available',  color: '#e8f5e9', textColor: '#1b5e20', border: '#4caf50' },
  CAUTION:   { label: 'Caution',    color: '#fff8e1', textColor: '#e65100', border: '#ffa726' },
  REST:      { label: 'Rest',       color: '#ffebee', textColor: '#b71c1c', border: '#ef5350' },
}

export default function PitchStatusChip({ status, pitchStatus, size = 'small' }: Props) {
  const cfg = CONFIG[status]

  // Enrich label when we have full status detail
  let label = cfg.label
  if (pitchStatus?.consecutive_day_block && status === 'REST') {
    label = 'Rest (3-Day)'
  } else if (pitchStatus?.days_rest_required && status === 'REST') {
    label = `Rest (${pitchStatus.days_rest_required}d)`
  } else if (pitchStatus?.consecutive_days_pitched === 2 && status === 'CAUTION') {
    label = 'Caution (2-Day)'
  }

  const chip = (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: cfg.color,
        color: cfg.textColor,
        border: `1px solid ${cfg.border}`,
        fontWeight: 700,
      }}
    />
  )

  if (!pitchStatus?.warnings?.length) return chip

  return (
    <Tooltip title={pitchStatus.warnings.join(' · ')} arrow>
      {chip}
    </Tooltip>
  )
}

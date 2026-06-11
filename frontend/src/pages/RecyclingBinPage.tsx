import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Paper,
  Table, TableBody, TableCell, TableHead, TableRow,
  Tooltip, Typography,
} from '@mui/material'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import RestoreIcon from '@mui/icons-material/Restore'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { getPlayers, restorePlayer, deletePlayerPermanently } from '../api/players'

const RED = '#C41230'

export default function RecyclingBinPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await getPlayers({ archived: true } as any)
      setPlayers(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load archived players.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRestore = async (id: number, name: string) => {
    if (!confirm(`Restore ${name} to active players?`)) return
    try { await restorePlayer(id); await load() }
    catch { setError('Restore failed.') }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently delete ${name}? This CANNOT be undone. All pitch counts, evaluations, and enrollment data for this player will also be deleted.`)) return
    try { await deletePlayerPermanently(id); await load() }
    catch { setError('Delete failed.') }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111' }}>Recycling Bin</Typography>
          {!loading && players.length > 0 && (
            <Chip label={players.length} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700 }} />
          )}
        </Box>
        <Typography sx={{ color: '#777', fontSize: '0.875rem', ml: '20px' }}>
          Archived players are hidden from all active views. Restore them to make them active again, or permanently delete them here.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : players.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, py: 8, textAlign: 'center' }}>
          <DeleteSweepIcon sx={{ fontSize: 52, color: '#e4e4e7', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: '#aaa', mb: 0.5 }}>Recycling Bin is Empty</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#bbb' }}>
            Archived players will appear here. You can restore or permanently delete them.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Name', 'Division', 'Team', 'DOB', 'Sport', 'Archived', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: RED, bgcolor: '#fafafa' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {p.last_name}, {p.first_name}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.82rem', color: '#555' }}>{p.division_name || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem', color: '#555' }}>{p.team_name || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{p.date_of_birth || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.sport === 'softball' ? 'Softball' : 'Baseball'}
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.65rem', fontWeight: 700,
                        bgcolor: p.sport === 'softball' ? 'rgba(106,27,154,0.1)' : 'rgba(21,101,192,0.1)',
                        color: p.sport === 'softball' ? '#6a1b9a' : '#1565c0',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: '#aaa' }}>
                    {p.archived_at ? new Date(p.archived_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Restore to active players">
                      <Button size="small" onClick={() => handleRestore(p.id, p.full_name)}
                        startIcon={<RestoreIcon sx={{ fontSize: 15 }} />}
                        sx={{ fontSize: '0.72rem', color: '#2e7d32', mr: 0.5 }}>
                        Restore
                      </Button>
                    </Tooltip>
                    <Tooltip title="Permanently delete — cannot be undone">
                      <Button size="small" onClick={() => handleDelete(p.id, p.full_name)}
                        startIcon={<DeleteForeverIcon sx={{ fontSize: 15 }} />}
                        sx={{ fontSize: '0.72rem', color: RED }}>
                        Delete
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  )
}

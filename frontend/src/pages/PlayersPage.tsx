import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'

import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import SearchIcon from '@mui/icons-material/Search'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import { getPlayerPitchSummary } from '../api/players'
import type { Player } from '@/models/player'
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null)

  useEffect(() => {
    getPlayerPitchSummary()
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : [])
      })
      .catch(() =>
        setError('Failed to load players. Is the backend running?')
      )
      .finally(() => setLoading(false))
  }, [])

  const filteredPlayers = (players ?? []).filter((p: any) => {
    const q = search?.toLowerCase() ?? ''
    const name = (p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`).toLowerCase()
    const team = p.team_name?.toLowerCase() ?? ''
    const division = p.division_name?.toLowerCase() ?? ''

    return (
      name.includes(q) ||
      team.includes(q) ||
      division.includes(q)
    )
  })

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Roster
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          Players
        </Typography>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 2.5 }}>
        <TextField
          size="small"
          placeholder="Search by name, team, or division…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 340 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Player Cards */}
      {!loading && !error && (
        <Box>
          {filteredPlayers.length === 0 ? (
            <Alert severity="info">No players found.</Alert>
          ) : (
            filteredPlayers.map((player: any) => {
              const isOpen = expandedPlayerId === player.id
              const risk = player?.pitch_status?.risk_level

              const riskColor:
                | "success"
                | "warning"
                | "error"
                | "default" =
                risk === 'HIGH'
                  ? 'error'
                  : risk === 'MED'
                  ? 'warning'
                  : risk === 'LOW'
                  ? 'success'
                  : 'default'

              const status = player?.pitch_status?.status

              const statusColor =
                status === 'AVAILABLE'
                  ? 'success.main'
                  : status === 'CAUTION'
                  ? 'warning.main'
                  : status === 'REST'
                  ? 'error.main'
                  : 'text.primary'

              return (
                <Card key={player.id} sx={{ mb: 1 }}>
                  {/* Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    {/* Player identity */}
                    <Box>
                      <Typography
                        component={Link}
                        to={`/players/${player.id}`}
                        sx={{
                          textDecoration: 'none',
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        {player.first_name} {player.last_name ?? 'Unknown Player'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {player.team_name ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {player.division_name ?? '—'}
                        </Typography>

                        {/* Risk badge */}
                        {risk && (
                          <Chip
                            size="small"
                            label={risk}
                            color={riskColor}
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Expand button */}
                    <IconButton
                      onClick={() =>
                        setExpandedPlayerId(isOpen ? null : player.id)
                      }
                    >
                      {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>

                  {/* Expandable details */}
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <Divider />

                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="body2">
                        <strong>Pitch Count:</strong>{' '}
                        <Box component="span" sx={{ color: statusColor, fontWeight: 600 }}>
                          {player.last_pitches ?? '—'}
                        </Box>
                      </Typography>

                      <Typography variant="body2">
                        <strong>Last Game Date:</strong>{' '}
                        {player.last_game_date ?? '—'}
                      </Typography>

                      <Typography variant="body2">
                        <strong>Next Available:</strong>{' '}
                        {player.pitch_status?.next_available_date ?? '—'}
                      </Typography>
                    </Box>
                  </Collapse>
                </Card>
              )
            })
          )}
        </Box>
      )}

      {/* Footer count */}
      {!loading && !error && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1.5, display: 'block' }}
        >
          {filteredPlayers.length} of {players.length} players
        </Typography>
      )}
    {/* Floating Log Pitches Button */}
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Button
        component={Link}
        to="/pitch-log"
        variant="contained"
        size="large"
        startIcon={<SportsBaseballIcon />}
        sx={{
          pointerEvents: 'auto',
          px: 4,
          py: 1.25,
          borderRadius: 999,
          fontWeight: 600,
          boxShadow: 3,
        }}
      >
        Log Pitches
      </Button>
    </Box>
    </Box>
  )
}
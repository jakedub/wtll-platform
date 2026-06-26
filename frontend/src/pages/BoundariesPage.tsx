/**
 * BoundariesPage — interactive map viewer for WTLL, District 8, and District 7 boundaries.
 * Uses Leaflet + OpenStreetMap (no API key required).
 * KML files are fetched from /api/district/kml/?district=wtll|8|7|combined
 *
 * Admin panel at the bottom:
 *   - Per-district KML file upload (replaces KML in the DB)
 *   - League editor (change district assignments) + Regenerate KML button
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  TextField,
  MenuItem,
  Snackbar,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HomeIcon from '@mui/icons-material/Home'
import EditIcon from '@mui/icons-material/Edit'
import PlaceIcon from '@mui/icons-material/Place'
import RefreshIcon from '@mui/icons-material/Refresh'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import client from '../api/client'

// ── Types ────────────────────────────────────────────────────────────────────

interface BoundaryTab {
  key: 'wtll' | '8' | '7' | 'combined'
  label: string
  subtitle: string
  color: string
  fillColor: string
}

interface LinkedLocation {
  id: number
  name: string
  short_name: string
  city: string
  state: string
  is_home: boolean
  field_count: number
}

interface League {
  id: number
  league_id: number
  league_name: string
  league_location: string
  address: string
  district: number | null
  shared_boundary_with: string
  shape_components: object[]
  linked_locations?: LinkedLocation[]
}

// ── LL → Little League expansion ─────────────────────────────────────────────
// "EAGLE CREEK LL" → "Eagle Creek Little League"
// "SOUTHPORT LITTLE LEAGUE" → already correct, just title-case it
function expandLL(raw: string): string {
  // Replace standalone " LL" (word boundary) with " Little League"
  const expanded = raw.replace(/\bLL\b/g, 'Little League')
  // Title-case the result
  return expanded
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase())
    // Preserve "Little League" casing after toLowerCase
    .replace(/little league/gi, 'Little League')
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: BoundaryTab[] = [
  {
    key: 'wtll',
    label: 'WTLL',
    subtitle: 'Washington Township Little League',
    color: '#C41230',
    fillColor: '#C41230',
  },
  {
    key: '8',
    label: 'District 8',
    subtitle: 'Indiana Little League District 8 — all leagues',
    color: '#1565c0',
    fillColor: '#1565c0',
  },
  {
    key: '7',
    label: 'District 7',
    subtitle: 'Indiana Little League District 7 — all leagues',
    color: '#2e7d32',
    fillColor: '#2e7d32',
  },
  {
    key: 'combined',
    label: 'D7 + D8',
    subtitle: 'Districts 7 and 8 combined — blue = D8, green = D7',
    color: '#6a1b9a',
    fillColor: '#6a1b9a',
  },
]

// Indianapolis area center
const DEFAULT_CENTER: L.LatLngExpression = [39.83, -86.18]
const DEFAULT_ZOOM = 9

// ── KML parser ────────────────────────────────────────────────────────────────

interface ParsedPlacemark {
  name: string
  rings: L.LatLngExpression[][]
}

function parseKML(kmlText: string): ParsedPlacemark[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(kmlText, 'application/xml')
  const placemarks = Array.from(doc.querySelectorAll('Placemark'))

  return placemarks.flatMap((pm) => {
    const name =
      pm.querySelector('name')?.textContent?.trim() ?? 'Unknown'

    const coordEls = Array.from(pm.querySelectorAll('coordinates'))
    const rings: L.LatLngExpression[][] = coordEls.map((el) => {
      const raw = el.textContent?.trim() ?? ''
      return raw
        .split(/\s+/)
        .filter(Boolean)
        .map((pt) => {
          const [lng, lat] = pt.split(',').map(Number)
          return [lat, lng] as L.LatLngExpression
        })
    })

    return rings.length ? [{ name, rings }] : []
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BoundariesPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [kmlCache, setKmlCache] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // League editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [leagues, setLeagues] = useState<League[]>([])
  const [leaguesLoading, setLeaguesLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // "Leagues by District" expandable sections — D8 open by default
  const [expandedDistrict, setExpandedDistrict] = useState<number | null>(8)
  // Left sidebar (Update Maps) collapse state
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const tab = TABS[activeTab]

  // ── Load leagues on mount (with linked locations) ────────────────────────
  useEffect(() => {
    client.get('/district/leagues/?include_locations=true')
      .then((r) => setLeagues(r.data ?? []))
      .catch(() => {})
      .finally(() => setLeaguesLoading(false))
  }, [])

  // ── Initialise the map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    layerGroupRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
    }
  }, [])

  // ── Draw polygons for the active tab ────────────────────────────────────
  // color/fillColor are used for single-district tabs; for combined the KML
  // carries two folders — blue for D8, green for D7.
  const drawPolygons = useCallback(
    (kmlText: string, color: string, fillColor: string, combined = false) => {
      const map = mapRef.current
      const group = layerGroupRef.current
      if (!map || !group) return

      group.clearLayers()

      const parser = new DOMParser()
      const doc = parser.parseFromString(kmlText, 'application/xml')
      const allBounds: L.LatLng[] = []

      if (combined) {
        // Two folders: District 8 (blue) and District 7 (green)
        const folders = Array.from(doc.querySelectorAll('Folder'))
        const folderColors: [string, string][] = [
          ['#1565c0', '#1565c0'],
          ['#2e7d32', '#2e7d32'],
        ]
        folders.forEach((folder, fi) => {
          const [fc, ff] = folderColors[fi] ?? ['#888', '#888']
          const folderName = folder.querySelector('name')?.textContent ?? ''
          folder.querySelectorAll('Placemark').forEach((pm) => {
            const name = pm.querySelector('name')?.textContent?.trim() ?? folderName
            const coordEls = Array.from(pm.querySelectorAll('coordinates'))
            coordEls.forEach((el) => {
              const ring: L.LatLngExpression[] = (el.textContent?.trim() ?? '')
                .split(/\s+/)
                .filter(Boolean)
                .map((pt) => {
                  const [lng, lat] = pt.split(',').map(Number)
                  return [lat, lng] as L.LatLngExpression
                })
              if (!ring.length) return
              const poly = L.polygon(ring, {
                color: fc,
                fillColor: ff,
                fillOpacity: 0.15,
                weight: 2,
              })
              poly.bindTooltip(name, { sticky: true })
              poly.addTo(group!)
              ring.forEach((pt) => {
                const ll = Array.isArray(pt)
                  ? L.latLng(pt[0] as number, pt[1] as number)
                  : (pt as L.LatLng)
                allBounds.push(ll)
              })
            })
          })
        })
      } else {
        const placemarks = parseKML(kmlText)
        placemarks.forEach(({ name, rings }) => {
          rings.forEach((ring) => {
            const poly = L.polygon(ring, {
              color,
              fillColor,
              fillOpacity: 0.15,
              weight: 2,
            })
            poly.bindTooltip(name, { sticky: true })
            poly.addTo(group!)
            ring.forEach((pt) => {
              const ll = Array.isArray(pt)
                ? L.latLng(pt[0] as number, pt[1] as number)
                : (pt as L.LatLng)
              allBounds.push(ll)
            })
          })
        })
      }

      if (allBounds.length) {
        map.fitBounds(L.latLngBounds(allBounds), { padding: [32, 32] })
      }
    },
    []
  )

  // ── Fetch KML when tab changes ───────────────────────────────────────────
  useEffect(() => {
    const { key, color, fillColor } = tab

    const isCombined = key === 'combined'

    if (kmlCache[key]) {
      drawPolygons(kmlCache[key], color, fillColor, isCombined)
      return
    }

    setLoading(true)
    setError(null)

    client
      .get(`/district/kml/?district=${key}`, { responseType: 'text' })
      .then((res) => {
        const text = res.data as string
        setKmlCache((prev) => ({ ...prev, [key]: text }))
        drawPolygons(text, color, fillColor, isCombined)
      })
      .catch(() => {
        setError(`Failed to load ${tab.label} boundary data.`)
      })
      .finally(() => setLoading(false))
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── KML upload ───────────────────────────────────────────────────────────
  const handleKmlUpload = (districtKey: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.kml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const fd = new FormData()
      fd.append('file', file)
      try {
        await client.post(`/district/kml/?district=${districtKey}`, fd)
        // Bust the cache so the map reloads the updated KML
        setKmlCache((prev) => {
          const next = { ...prev }
          delete next[districtKey]
          return next
        })
        const label = TABS.find((t) => t.key === districtKey)?.label ?? districtKey
        setToast(`${label} KML updated`)
        // Re-trigger fetch for the currently visible tab if it matches
        const idx = TABS.findIndex((t) => t.key === districtKey)
        if (idx !== -1 && activeTab === idx) {
          setActiveTab(-1)
          setTimeout(() => setActiveTab(idx), 0)
        }
      } catch {
        setToast('Upload failed — check the file is a valid .kml')
      }
    }
    input.click()
  }

  // ── Open league editor ───────────────────────────────────────────────────
  const openEditor = async () => {
    setEditorOpen(true)
    // Leagues already loaded on mount; only refresh if empty for some reason
    if (leagues.length === 0) {
      setLeaguesLoading(true)
      try {
        const res = await client.get('/district/leagues/?include_locations=true')
        setLeagues(res.data)
      } catch {
        setToast('Failed to load league data')
      } finally {
        setLeaguesLoading(false)
      }
    }
  }

  const handleDistrictChange = async (leagueId: number, newDistrict: number | null) => {
    // Optimistic update
    setLeagues((prev) =>
      prev.map((lg) => (lg.id === leagueId ? { ...lg, district: newDistrict } : lg))
    )
    try {
      await client.patch(`/district/leagues/${leagueId}/`, { district: newDistrict })
    } catch {
      setToast('Failed to save — reload and try again')
    }
  }

  const handleAddressChange = async (leagueId: number, address: string) => {
    setLeagues((prev) =>
      prev.map((lg) => (lg.id === leagueId ? { ...lg, address } : lg))
    )
    try {
      await client.patch(`/district/leagues/${leagueId}/`, { address })
    } catch {
      setToast('Failed to save address')
    }
  }

  const handleDeleteLeague = async (leagueId: number, leagueName: string) => {
    if (!confirm(`Remove "${expandLL(leagueName)}" from the league list? This cannot be undone.`)) return
    try {
      await client.delete(`/district/leagues/${leagueId}/`)
      setLeagues((prev) => prev.filter((lg) => lg.id !== leagueId))
      setToast(`${expandLL(leagueName)} removed`)
    } catch {
      setToast('Delete failed')
    }
  }

  const handleRegenerateKML = async () => {
    setRegenerating(true)
    try {
      await client.post('/district/kml/regenerate/')
      // Bust all caches so every tab reloads from the freshly generated KML
      setKmlCache({})
      setEditorOpen(false)
      setToast('All KML maps regenerated and updated')
    } catch {
      setToast('Regeneration failed — check the console')
    } finally {
      setRegenerating(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 4, height: 28, bgcolor: '#6a1b9a', borderRadius: 1, flexShrink: 0 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>League Boundaries</Typography>
          <Typography variant="body2" color="text.secondary">
            WTLL district boundary and surrounding Indiana District 7 &amp; 8 leagues
          </Typography>
        </Box>
      </Box>

      {/* ── Two-column layout: sidebar + map ─────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

        {/* Left sidebar — Update Maps (collapsible) */}
        <Box sx={{
          width: sidebarOpen ? 240 : 40,
          flexShrink: 0,
          transition: 'width 0.2s',
          overflow: 'hidden',
        }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Sidebar header row */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: sidebarOpen ? 1.5 : 0.5, py: 1,
              bgcolor: '#1c1c1e',
              cursor: 'pointer',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
            }}
              onClick={() => setSidebarOpen(o => !o)}
            >
              {sidebarOpen && (
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  Update Maps
                </Typography>
              )}
              <Tooltip title={sidebarOpen ? 'Collapse' : 'Update Maps'} placement="right">
                <Box sx={{ color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
                  {sidebarOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                </Box>
              </Tooltip>
            </Box>

            {/* Sidebar content */}
            <Collapse in={sidebarOpen}>
              <Box sx={{ p: 1.5 }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#aaa', mb: 1.5, lineHeight: 1.4 }}>
                  Upload a replacement .kml for any map, or edit leagues and regenerate.
                </Typography>

                <Stack gap={1} sx={{ mb: 2 }}>
                  {TABS.map((t) => (
                    <Button
                      key={t.key}
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<UploadFileIcon sx={{ fontSize: '14px !important' }} />}
                      onClick={() => handleKmlUpload(t.key)}
                      sx={{
                        fontSize: '0.72rem', justifyContent: 'flex-start',
                        borderColor: t.color, color: t.color,
                        '&:hover': { borderColor: t.color, bgcolor: `${t.color}12` },
                      }}
                    >
                      {t.label} KML
                    </Button>
                  ))}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                  onClick={openEditor}
                  sx={{
                    fontSize: '0.72rem', bgcolor: '#1565c0',
                    '&:hover': { bgcolor: '#0d47a1' },
                  }}
                >
                  Edit Leagues
                </Button>
                <Typography sx={{ fontSize: '0.68rem', color: '#aaa', mt: 0.75, lineHeight: 1.4 }}>
                  Reassign districts, add addresses, and regenerate all KML maps.
                </Typography>
              </Box>
            </Collapse>
          </Paper>
        </Box>

        {/* Right — Map */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minWidth: 100 } }}
              >
                {TABS.map((t) => (
                  <Tab key={t.key} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: t.color, flexShrink: 0 }} />
                      {t.label}
                    </Box>
                  } />
                ))}
              </Tabs>
            </Box>

            {/* Sub-header */}
            <Box sx={{
              px: 2, py: 1,
              bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <Chip size="small" label={tab.label}
                sx={{ bgcolor: tab.color, color: '#fff', fontWeight: 700, fontSize: 11 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                {tab.subtitle}
              </Typography>
              {loading && <CircularProgress size={13} sx={{ ml: 'auto' }} />}
            </Box>

            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

            {/* Map */}
            <Box ref={mapContainerRef} sx={{ height: 560, width: '100%', bgcolor: '#e8eaed' }} />
          </Paper>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
            Map data © OpenStreetMap contributors. Boundaries sourced from Little League International League Finder.
          </Typography>
        </Box>
      </Box>

      {/* ── League editor dialog ──────────────────────────────────────────── */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <EditIcon fontSize="small" />
          League Editor
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {leaguesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50', minWidth: 200 }}>League</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50', minWidth: 110 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50', minWidth: 260 }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50', width: 150 }}>District</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Flags</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50', width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leagues.map((lg) => (
                    <TableRow key={lg.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                          {expandLL(lg.league_name)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                          {lg.league_location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          placeholder="Street address"
                          defaultValue={lg.address ?? ''}
                          onBlur={(e) => {
                            if (e.target.value !== (lg.address ?? ''))
                              handleAddressChange(lg.id, e.target.value)
                          }}
                          InputProps={{ disableUnderline: false, sx: { fontSize: 12 } }}
                          sx={{ width: '100%' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={lg.district ?? ''}
                          onChange={(e) =>
                            handleDistrictChange(lg.id, e.target.value === '' ? null : Number(e.target.value))
                          }
                          sx={{ fontSize: 12, minWidth: 130 }}
                        >
                          <MenuItem value="">Unassigned</MenuItem>
                          <MenuItem value={8}>District 8</MenuItem>
                          <MenuItem value={7}>District 7</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {lg.shared_boundary_with && (
                            <Chip label="Shared boundary" size="small" color="default" sx={{ fontSize: 10 }} />
                          )}
                          {!lg.shape_components?.length && (
                            <Chip label="No coordinates" size="small" color="warning" sx={{ fontSize: 10 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remove league">
                          <IconButton size="small"
                            onClick={() => handleDeleteLeague(lg.id, lg.league_name)}
                            sx={{ color: '#ddd', '&:hover': { color: '#ef5350' } }}>
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {leagues.length} leagues · Changes save automatically. Click Regenerate to rebuild KML maps.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setEditorOpen(false)} disabled={regenerating}>Close</Button>
            <Button variant="contained"
              startIcon={regenerating ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
              onClick={handleRegenerateKML} disabled={regenerating}>
              Regenerate KML
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ── Leagues by District — D8 first ───────────────────────────────── */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box sx={{ width: 4, height: 24, bgcolor: '#6a1b9a', borderRadius: 1 }} />
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
            Leagues by District
          </Typography>
          {leaguesLoading && <CircularProgress size={14} />}
        </Box>

        {/* District 8 first, then District 7 */}
        {[
          { district: 8, label: 'District 8', color: '#1565c0', fillColor: '#e3f2fd' },
          { district: 7, label: 'District 7', color: '#2e7d32', fillColor: '#e8f5e9' },
        ].map(({ district, label, color, fillColor }) => {
          const group = leagues.filter((lg) => lg.district === district)
          const isOpen = expandedDistrict === district
          return (
            <Paper key={district} variant="outlined" sx={{ borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
              <Box
                onClick={() => setExpandedDistrict(isOpen ? null : district)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.25, cursor: 'pointer', bgcolor: fillColor,
                  borderBottom: isOpen ? '1px solid' : 'none', borderColor: `${color}33`,
                  '&:hover': { bgcolor: `${color}18` },
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700, color, fontSize: '0.9rem', flex: 1 }}>{label}</Typography>
                <Chip label={`${group.length} leagues`} size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: color, color: '#fff' }} />
                <ExpandMoreIcon sx={{
                  fontSize: 20, color,
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }} />
              </Box>

              <Collapse in={isOpen}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {group.length === 0 && (
                    <Typography sx={{ px: 2, py: 2, fontSize: '0.82rem', color: '#aaa', fontStyle: 'italic' }}>
                      No leagues assigned to this district.
                    </Typography>
                  )}
                  {group.map((lg, gi) => {
                    const displayName = expandLL(lg.league_name)
                    const isWTLL = lg.league_name.toLowerCase().includes('washington township')
                    const locs = lg.linked_locations ?? []
                    return (
                      <Box key={lg.id} sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 2,
                        px: 2, py: 1.25,
                        borderTop: gi === 0 ? 'none' : '1px solid #f0f0f0',
                        bgcolor: isWTLL ? '#fff8f0' : 'transparent',
                        '&:hover': { bgcolor: isWTLL ? '#fff3e0' : '#fafbff' },
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: isWTLL ? 700 : 600, fontSize: '0.88rem', color: isWTLL ? '#C41230' : '#111' }}>
                              {displayName}
                            </Typography>
                            {isWTLL && (
                              <Chip label="WTLL" size="small"
                                sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#C41230', color: '#fff' }} />
                            )}
                            {!lg.shape_components?.length && (
                              <Chip label="No boundary" size="small"
                                sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#fff3cd', color: '#856404' }} />
                            )}
                            {lg.shared_boundary_with && (
                              <Chip label="Shared boundary" size="small"
                                sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#f5f5f5', color: '#777' }} />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.25 }}>
                            {lg.league_location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PlaceIcon sx={{ fontSize: 12, color: '#aaa' }} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#888' }}>{lg.league_location}</Typography>
                              </Box>
                            )}
                            {lg.address && (
                              <Typography sx={{ fontSize: '0.72rem', color: '#aaa' }}>{lg.address}</Typography>
                            )}
                          </Box>
                        </Box>

                        {locs.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end', pt: 0.25 }}>
                            {locs.map(loc => (
                              <Tooltip key={loc.id}
                                title={`${loc.field_count} field${loc.field_count !== 1 ? 's' : ''}`} arrow>
                                <Chip
                                  icon={loc.is_home
                                    ? <HomeIcon sx={{ fontSize: '12px !important' }} />
                                    : <SportsSoccerIcon sx={{ fontSize: '12px !important' }} />}
                                  label={loc.short_name || loc.name}
                                  size="small"
                                  sx={{
                                    height: 22, fontSize: '0.68rem',
                                    bgcolor: loc.is_home ? '#fdecea' : '#f3f0ff',
                                    color: loc.is_home ? '#C41230' : '#5b21b6',
                                    '& .MuiChip-icon': { color: loc.is_home ? '#C41230' : '#7c3aed' },
                                  }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: '0.7rem', color: '#ccc', pt: 0.5, flexShrink: 0 }}>
                            No locations linked
                          </Typography>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Collapse>
            </Paper>
          )
        })}

        {/* Unassigned / Other */}
        {(() => {
          const unassigned = leagues.filter(lg => !lg.district && lg.league_name)
          if (!unassigned.length) return null
          return (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.25, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#888', flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700, color: '#555', fontSize: '0.9rem', flex: 1 }}>Other / Unassigned</Typography>
                <Chip label={`${unassigned.length}`} size="small"
                  sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#e0e0e0', color: '#555' }} />
              </Box>
              {unassigned.map((lg, gi) => (
                <Box key={lg.id} sx={{
                  px: 2, py: 1,
                  borderTop: gi === 0 ? 'none' : '1px solid #f0f0f0',
                  '&:hover': { bgcolor: '#fafbff' },
                }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{expandLL(lg.league_name)}</Typography>
                  {lg.league_location && (
                    <Typography sx={{ fontSize: '0.72rem', color: '#888' }}>{lg.league_location}</Typography>
                  )}
                </Box>
              ))}
            </Paper>
          )
        })()}
      </Box>

      {/* Toast notifications */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

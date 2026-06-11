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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Snackbar,
  Divider,
  Stack,
} from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
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

interface League {
  id: number
  league_id: number
  league_name: string
  league_location: string
  district: number | null
  shared_boundary_with: string
  shape_components: object[]
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
  const [leaguesLoading, setLeaguesLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const tab = TABS[activeTab]

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
    setLeaguesLoading(true)
    try {
      const res = await client.get('/district/leagues/')
      setLeagues(res.data)
    } catch {
      setToast('Failed to load league data')
    } finally {
      setLeaguesLoading(false)
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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <MapIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            League Boundaries
          </Typography>
          <Typography variant="body2" color="text.secondary">
            WTLL district boundary and surrounding Indiana District 7 &amp; 8 leagues
          </Typography>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minWidth: 110 },
            }}
          >
            {TABS.map((t) => (
              <Tab
                key={t.key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: t.color,
                        flexShrink: 0,
                      }}
                    />
                    {t.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Sub-header */}
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            bgcolor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Chip
            size="small"
            label={tab.label}
            sx={{ bgcolor: tab.color, color: '#fff', fontWeight: 700, fontSize: 12 }}
          />
          <Typography variant="body2" color="text.secondary">
            {tab.subtitle}
          </Typography>
          {loading && <CircularProgress size={14} sx={{ ml: 'auto' }} />}
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {/* Map */}
        <Box
          ref={mapContainerRef}
          sx={{ height: 560, width: '100%', bgcolor: '#e8eaed' }}
        />
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Map data © OpenStreetMap contributors. Boundaries sourced from Little League International League Finder.
      </Typography>

      {/* ── Update Maps panel ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mt: 3, p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Update Maps
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a replacement .kml file for any individual map, or open the league editor to
          reassign district boundaries and regenerate all four maps at once.
        </Typography>

        {/* Per-district KML upload buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
          {TABS.map((t) => (
            <Button
              key={t.key}
              variant="outlined"
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => handleKmlUpload(t.key)}
              sx={{
                borderColor: t.color,
                color: t.color,
                '&:hover': { borderColor: t.color, bgcolor: `${t.color}12` },
              }}
            >
              Upload {t.label} KML
            </Button>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={openEditor}
            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}
          >
            Edit Leagues &amp; Regenerate
          </Button>
          <Typography variant="body2" color="text.secondary">
            Change which leagues are in D7 or D8, then regenerate all KML files from the updated data.
          </Typography>
        </Box>
      </Paper>

      {/* ── League editor dialog ──────────────────────────────────────────── */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="md"
        fullWidth
      >
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
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>League</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50', width: 150 }}>District</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.50' }}>Flags</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leagues.map((lg) => (
                    <TableRow key={lg.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {lg.league_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                          {lg.league_location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={lg.district ?? ''}
                          onChange={(e) =>
                            handleDistrictChange(
                              lg.id,
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          sx={{ fontSize: 13, minWidth: 130 }}
                        >
                          <MenuItem value="">Unassigned</MenuItem>
                          <MenuItem value={7}>District 7</MenuItem>
                          <MenuItem value={8}>District 8</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {lg.shared_boundary_with && (
                            <Chip
                              label="Shared boundary"
                              size="small"
                              color="default"
                              sx={{ fontSize: 11 }}
                            />
                          )}
                          {!lg.shape_components?.length && (
                            <Chip
                              label="No coordinates"
                              size="small"
                              color="warning"
                              sx={{ fontSize: 11 }}
                            />
                          )}
                        </Box>
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
            {leagues.length} leagues · District changes save automatically.
            Click Regenerate to rebuild all four KML maps from this data.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setEditorOpen(false)} disabled={regenerating}>
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={
                regenerating ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <RefreshIcon />
                )
              }
              onClick={handleRegenerateKML}
              disabled={regenerating}
            >
              Regenerate KML
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

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

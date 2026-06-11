/**
 * Print Evaluation Forms
 *
 * Generates printable evaluation slips — 2 players per page.
 * Ported from the original wtll project's EvaluationForm component,
 * extended with Program + Division filters.
 *
 * Majors and AAA players get extra rows for Pitcher and Catcher scoring.
 * Tee Ball is always excluded.
 */
import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Select from "@mui/material/Select"
import Typography from "@mui/material/Typography"
import PrintIcon from "@mui/icons-material/Print"
import ArticleIcon from "@mui/icons-material/Article"
import { getPlayers } from "../api/players"
import type { Player } from "@/models/player"

// Divisions that get pitcher + catcher scoring rows
const POSITION_DIVISIONS = ["majors", "aaa", "softball majors"]

// Division display order for printing
const DIV_ORDER: Record<string, number> = {
  "majors":          0,
  "aaa":             1,
  "aa":              2,
  "pee wee":         3,
  "softball majors": 4,
  "softball minors": 5,
}
function divOrder(name: string): number {
  return DIV_ORDER[(name || "").toLowerCase()] ?? 99
}

// ── Single evaluation card ────────────────────────────────────────────────────
function EvalCard({ player }: { player: Player | null }) {
  const divName = (player as any)?.division_name ?? ""
  const showPositions = POSITION_DIVISIONS.some(d => divName.toLowerCase().includes(d))

  return (
    <Box
      sx={{
        border: "1.5px solid #000",
        borderRadius: 1,
        p: "10px 14px",
        width: "100%",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        position: "relative",
        mb: "6px",
        "@media print": {
          breakInside: "avoid",
          fontSize: "10px",
        },
      }}
    >
      {/* Header */}
      <Typography sx={{ fontWeight: 700, textAlign: "center", fontSize: "inherit", mb: 0.5 }}>
        WASHINGTON TOWNSHIP LITTLE LEAGUE
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <span><strong>Division:</strong> {divName || "___________"}</span>
        <span><strong>Evaluator:</strong> _______________</span>
      </Box>

      <Box sx={{ display: "flex", gap: 4, mb: 0.5 }}>
        <span><strong>Player:</strong> {player ? `${player.first_name} ${player.last_name}` : "___________________________"}</span>
        <span><strong>DOB:</strong> {player?.date_of_birth ? new Date(player.date_of_birth + "T00:00:00").toLocaleDateString() : "__________"}</span>
      </Box>

      <Divider sx={{ borderColor: "#aaa", my: "4px" }} />

      {/* Hands + position interest */}
      <Box sx={{ display: "flex", gap: 3, mb: "4px" }}>
        <Box sx={{ flex: 1 }}>
          <strong>Batting Hand:</strong>
          <Box sx={{ display: "flex", gap: 2, mt: "2px" }}>
            <span>L ___</span><span>R ___</span><span>S ___</span>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <strong>Throwing Hand:</strong>
          <Box sx={{ display: "flex", gap: 2, mt: "2px" }}>
            <span>L ___</span><span>R ___</span>
          </Box>
        </Box>
        {showPositions && (
          <Box sx={{ flex: 1.5 }}>
            <strong>Position Interest:</strong>
            <Box sx={{ display: "flex", gap: 1.5, mt: "2px", flexWrap: "wrap" }}>
              <span>Pitcher ___</span><span>Catcher ___</span><span>Both ___</span><span>None ___</span>
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: "#aaa", my: "4px" }} />

      {/* Scoring grid */}
      <Box sx={{ display: "grid", gridTemplateColumns: showPositions ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 1 }}>
        <Box>
          <strong>Hitting</strong>
          <Box sx={{ mt: "2px", lineHeight: 1.7 }}>
            <div>Form: ______</div>
            <div>Power: ______</div>
            <div>Contact: ______</div>
          </Box>
        </Box>
        <Box>
          <strong>Fielding</strong>
          <Box sx={{ mt: "2px", lineHeight: 1.7 }}>
            <div>Form: ______</div>
            <div>Glove: ______</div>
            <div>Hustle: ______</div>
          </Box>
        </Box>
        <Box>
          <strong>Throwing</strong>
          <Box sx={{ mt: "2px", lineHeight: 1.7 }}>
            <div>Form: ______</div>
            <div>Speed: ______</div>
            <div>Accuracy: ______</div>
          </Box>
        </Box>
        {showPositions && (
          <>
            <Box>
              <strong>Pitcher</strong>
              <Box sx={{ mt: "2px", lineHeight: 1.7 }}>
                <div>Speed: ______</div>
                <div>Accuracy: ______</div>
              </Box>
            </Box>
            <Box>
              <strong>Catcher</strong>
              <Box sx={{ mt: "2px", lineHeight: 1.7 }}>
                <div>Receiving: ______</div>
                <div>Blocking: ______</div>
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ position: "absolute", bottom: 4, right: 8, fontSize: "9px", color: "#555" }}>
        Rating: 1 to 5
      </Box>
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrintEvaluationFormsPage() {
  const [players, setPlayers]   = useState<Player[]>([])
  const [loading, setLoading]   = useState(true)
  const [sport, setSport]       = useState<"baseball" | "softball">("baseball")
  const [divFilter, setDivFilter] = useState<string>("all")
  const [showBlank, setShowBlank] = useState(false)

  useEffect(() => {
    setLoading(true)
    getPlayers({ sport } as any)
      .then(data => {
        // Exclude Tee Ball, sort alphabetically within each division
        const filtered = data.filter(p => {
          const div = ((p as any).division_name ?? "").toLowerCase()
          return !div.includes("tee ball") && !div.includes("teeball")
        })
        filtered.sort((a, b) => {
          const da = (a as any).division_name ?? "", db = (b as any).division_name ?? ""
          const dOrder = divOrder(da) - divOrder(db)
          if (dOrder !== 0) return dOrder
          return (a.last_name ?? "").localeCompare(b.last_name ?? "")
        })
        setPlayers(filtered)
      })
      .finally(() => setLoading(false))
  }, [sport])

  // All distinct division names for filter dropdown
  const divisions = Array.from(
    new Set(players.map(p => (p as any).division_name ?? "No Division"))
  ).sort((a, b) => divOrder(a) - divOrder(b))

  // Players to print
  const printPlayers: (Player | null)[] = showBlank
    ? [null, null]
    : players.filter(p => divFilter === "all" || (p as any).division_name === divFilter)

  // Group into pairs (2 per printed page)
  const pairs: (Player | null)[][] = []
  for (let i = 0; i < printPlayers.length; i += 2) {
    pairs.push(printPlayers.slice(i, i + 2))
  }

  const handlePrint = () => window.print()

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3, "@media print": { display: "none" } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#6a1b9a", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Print Evaluation Forms</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          2 player slips per page · Majors and AAA include pitcher/catcher rows · Tee Ball excluded
        </Typography>
      </Box>

      {/* Controls */}
      <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2, mb: 3, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", "@media print": { display: "none" } }}>
        {/* Sport */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Sport</InputLabel>
          <Select value={sport} label="Sport" onChange={e => { setSport(e.target.value as any); setDivFilter("all") }}>
            <MenuItem value="baseball">Baseball</MenuItem>
            <MenuItem value="softball">Softball</MenuItem>
          </Select>
        </FormControl>

        {/* Division */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Division</InputLabel>
          <Select value={divFilter} label="Division" onChange={e => setDivFilter(e.target.value)}>
            <MenuItem value="all">All Divisions</MenuItem>
            {divisions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        {/* Blank toggle */}
        <Button
          variant={showBlank ? "contained" : "outlined"}
          startIcon={<ArticleIcon />}
          onClick={() => setShowBlank(v => !v)}
          color="inherit"
          size="small"
        >
          {showBlank ? "Show Player Forms" : "Blank Forms"}
        </Button>

        {/* Print */}
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={loading}
          sx={{ bgcolor: "#6a1b9a", "&:hover": { bgcolor: "#4a148c" } }}
        >
          {loading ? "Loading…" : `Print ${showBlank ? "Blank" : `${printPlayers.length} Players`}`}
        </Button>
      </Paper>

      {/* Preview count */}
      {!showBlank && !loading && (
        <Typography sx={{ fontSize: "0.8rem", color: "#888", mb: 1.5, "@media print": { display: "none" } }}>
          {printPlayers.length} player{printPlayers.length !== 1 ? "s" : ""} · {pairs.length} page{pairs.length !== 1 ? "s" : ""}
          {divFilter !== "all" ? ` · ${divFilter}` : ""}
        </Typography>
      )}

      {/* Print area */}
      <Box sx={{ "@media print": { "& *": { boxSizing: "border-box" } } }}>
        {pairs.map((pair, pageIdx) => (
          <Box
            key={pageIdx}
            sx={{
              mb: 4,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              "@media print": {
                pageBreakAfter: pageIdx < pairs.length - 1 ? "always" : "auto",
                breakAfter: pageIdx < pairs.length - 1 ? "page" : "auto",
                mb: 0,
              },
            }}
          >
            {pair.map((player, i) => (
              <EvalCard key={i} player={player} />
            ))}
            {/* Pad odd last page with a blank */}
            {pair.length === 1 && <EvalCard key="blank" player={null} />}
          </Box>
        ))}

        {!loading && printPlayers.length === 0 && !showBlank && (
          <Box sx={{ textAlign: "center", py: 6, color: "#bbb", "@media print": { display: "none" } }}>
            <ArticleIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography>No players found for the selected filters.</Typography>
          </Box>
        )}
      </Box>

      {/* Print-only header */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #root { display: block !important; }
          nav, header, aside { display: none !important; }
        }
      `}</style>
    </Box>
  )
}

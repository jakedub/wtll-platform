import React, { useState, useEffect } from "react"
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import ViewColumnIcon from "@mui/icons-material/ViewColumn"

interface JsonToTableConverterProps {
  data: any
}

// Columns shown by default when a report first loads. Anything else the
// report carries is still available from the Columns dropdown, this just
// keeps the initial view from opening with every raw BlueSombrero field
// (~190 of them) turned on at once. Matched against the real column names
// case-insensitively, and falling back to a partial match (e.g. "Division"
// matching "Division Name"), so small header wording differences don't
// silently drop a column from the default view.
const DEFAULT_VISIBLE_COLUMNS = [
  "Player First Name",
  "Player Last Name",
  "Division Name",
  "Program Name",
  "Player Birth Date",
  "Team Name",
  "Jersey Size",
  "Player Physical Conditions",
  "Little League School Name",
  "Little League Eligibility",
  "Player Age",
  "User Id",
  "Gender",
]

function resolveDefaultColumns(defaults: string[], available: string[]): string[] {
  const lowerAvailable = available.map((c) => c.toLowerCase())
  const resolved: string[] = []

  defaults.forEach((wanted) => {
    const wantedLower = wanted.toLowerCase()
    const exactIdx = lowerAvailable.indexOf(wantedLower)
    if (exactIdx !== -1) {
      resolved.push(available[exactIdx])
      return
    }
    const partialIdx = lowerAvailable.findIndex((c) => c.includes(wantedLower))
    if (partialIdx !== -1) {
      resolved.push(available[partialIdx])
    }
  })

  return Array.from(new Set(resolved))
}

export function JsonToTableConverter({ data }: JsonToTableConverterProps) {
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    if (!data) {
      setParsedData([])
      setAvailableColumns([])
      setSelectedColumns([])
      return
    }

    let raw = data

    if (!Array.isArray(raw) && typeof raw === "object" && raw !== null) {
      if (Array.isArray(raw.data)) raw = raw.data
      else if (Array.isArray(raw.results)) raw = raw.results
      else if (Array.isArray(raw.items)) raw = raw.items
      else if (Array.isArray(raw.captured_endpoints)) raw = raw.captured_endpoints
      else if (Array.isArray(raw.records)) raw = raw.records
      else raw = [raw]
    }

    if (Array.isArray(raw) && raw.length > 0) {
      const keysSet = new Set<string>()
      raw.forEach((item) => {
        if (item && typeof item === "object") {
          Object.keys(item).forEach((key) => keysSet.add(key))
        }
      })

      const cols = Array.from(keysSet)
      const defaultCols = resolveDefaultColumns(DEFAULT_VISIBLE_COLUMNS, cols)
      setParsedData(raw)
      setAvailableColumns(cols)
      setSelectedColumns(defaultCols.length > 0 ? defaultCols : cols)
    }
  }, [data])

  const handleToggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "boolean") return val ? "true" : "false"
    if (typeof val === "object") return JSON.stringify(val)
    return String(val)
  }

  if (parsedData.length === 0) return null

  return (
    // 1. EXPAND PAPER CONTAINER HORIZONTALLY
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        p: 2.5,
        mt: 4,
        width: "100%",        // Takes up full container width
        maxWidth: "100%",     // Ensures no max-width constraints block horizontal growth
        boxSizing: "border-box",
      }}
    >
      {/* Controls Bar */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Parsed Report Table
          </Typography>
          <Chip
            label={`${parsedData.length} Rows`}
            size="small"
            sx={{ bgcolor: "#2e7d32", color: "#fff", fontWeight: 600 }}
          />
        </Box>

        {/* Column Selector Menu */}
        <Button
          variant="outlined"
          startIcon={<ViewColumnIcon />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="small"
        >
          Columns ({selectedColumns.length}/{availableColumns.length})
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { maxHeight: 350, width: 250, p: 1 } }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              px: 1,
              pb: 1,
              borderBottom: "1px solid #eee",
            }}
          >
            <Button size="small" onClick={() => setSelectedColumns(availableColumns)}>
              Select All
            </Button>
            <Button size="small" color="error" onClick={() => setSelectedColumns([])}>
              Deselect All
            </Button>
          </Box>

          {availableColumns.map((col) => (
            <MenuItem key={col} dense onClick={(e) => e.stopPropagation()} sx={{ py: 0.25 }}>
              <FormControlLabel
                sx={{ width: "100%", mr: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedColumns.includes(col)}
                    onChange={() => handleToggleColumn(col)}
                  />
                }
                label={<Typography sx={{ fontSize: "0.82rem" }}>{col}</Typography>}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* 2. TABLE CONTAINER - KEEP HEIGHT AT 500 BUT ALLOW HORIZONTAL SCROLLING */}
      <TableContainer sx={{ maxHeight: 500, overflowX: "auto", overflowY: "auto", width: "100%" }}>
        {/* 3. SET MIN-WIDTH ON TABLE OR CELL SPACING TO STRETCH COLUMNS HORIZONTALLY */}
        <Table stickyHeader size="small" sx={{ minWidth: "100%" }}>
          <TableHead>
            <TableRow>
              {selectedColumns.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "#f5f5f5",
                    whiteSpace: "nowrap",
                    px: 3,             // Increased horizontal padding (creates wider columns)
                    minWidth: 160,     // Ensures columns spread out rather than bunching up
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {parsedData.map((row, idx) => (
              <TableRow key={idx} hover>
                {selectedColumns.map((col) => (
                  <TableCell
                    key={col}
                    sx={{
                      fontSize: "0.82rem",
                      whiteSpace: "nowrap",
                      px: 3,          // Matching horizontal padding
                      minWidth: 160,  // Matching minimum width
                    }}
                  >
                    {renderCellValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
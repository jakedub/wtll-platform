import React, { useEffect, useRef, useState } from "react"
import {
  Alert, Box, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Button, InputAdornment, Paper, TextField,
  Tooltip, Typography,
} from "@mui/material"
import FolderIcon from "@mui/icons-material/Folder"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import DescriptionIcon from "@mui/icons-material/Description"
import DownloadIcon from "@mui/icons-material/Download"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import SearchIcon from "@mui/icons-material/Search"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import client from "../api/client"

const RED = "#C41230"

// ── Static built-in files (from public/forms/) ───────────────────────────────

const STATIC_FOLDERS = [
  {
    name: "All Star Forms",
    description: "Official Little League tournament forms — blank/unmarked versions ready to print.",
    files: [
      { name: "Tournament Verification Form",      filename: "TVF_blank.pdf",                 description: "Little League Tournament Player Verification — completed per player for district submission.", tag: "Required: all players" },
      { name: "Baseball School Enrollment Form",   filename: "Baseball_Enrollment_blank.pdf",  description: "School Enrollment Form with Baseball division pre-selected — completed by school administrator.", tag: "New players only" },
      { name: "Softball School Enrollment Form",   filename: "Softball_Enrollment_blank.pdf",  description: "School Enrollment Form with Softball division pre-selected — completed by school administrator.", tag: "New players only" },
    ],
  },
  {
    name: "League Bylaws & Charter",
    description: "Governing documents, league charter, and operating rules.",
    files: [
      { name: "WTLL Constitution and By-Laws (2025)", filename: "WTLL_Bylaws_2025.docx", description: "Updated bylaws incorporating all 16 board roles, SafeSport, background checks, conflict of interest, and disciplinary procedures. Supersedes all prior versions.", tag: "Pending Board Adoption" },
    ],
  },
  {
    name: "Board Reference Documents",
    description: "Board meeting minutes, resolutions, and reference materials.",
    files: [],
  },
]

// ── API helpers ───────────────────────────────────────────────────────────────

interface UploadedDoc {
  id: number
  folder_name: string
  display_name: string
  description: string
  tag: string
  url: string
  filename: string
  extension: string
  file_size: number
  uploaded_at: string
}

async function fetchUploaded(): Promise<UploadedDoc[]> {
  const res = await client.get("/documents/")
  return res.data ?? []
}

async function uploadDocument(folder: string, file: File, displayName: string, description: string, tag: string): Promise<UploadedDoc> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder_name", folder)
  fd.append("display_name", displayName)
  fd.append("description", description)
  fd.append("tag", tag)
  const res = await client.post("/documents/upload/", fd, { headers: { "Content-Type": "multipart/form-data" } })
  return res.data
}

async function deleteDocument(id: number): Promise<void> {
  await client.delete(`/documents/${id}/`)
}

async function updateDocument(id: number, patch: Partial<Pick<UploadedDoc, "display_name" | "description" | "tag" | "folder_name">>): Promise<UploadedDoc> {
  const res = await client.patch(`/documents/${id}/`, patch)
  return res.data
}

// ── Upload dialog ─────────────────────────────────────────────────────────────

function UploadDialog({
  open, folderName, onClose, onUploaded,
}: {
  open: boolean; folderName: string
  onClose: () => void; onUploaded: (doc: UploadedDoc) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [description, setDescription] = useState("")
  const [tag, setTag] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) { setFile(null); setDisplayName(""); setDescription(""); setTag(""); setError(null) }
  }, [open])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !displayName) setDisplayName(f.name.replace(/\.[^.]+$/, ""))
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setError(null)
    try {
      const doc = await uploadDocument(folderName, file, displayName || file.name, description, tag)
      onUploaded(doc)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Upload failed.")
    } finally { setUploading(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Upload to "{folderName}"</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* Drop zone */}
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              border: `2px dashed ${file ? RED : "#d4d4d8"}`, borderRadius: 2,
              p: 3, textAlign: "center", cursor: "pointer",
              bgcolor: file ? "rgba(196,18,48,0.03)" : "#fafafa",
              "&:hover": { borderColor: RED, bgcolor: "rgba(196,18,48,0.03)" },
            }}
          >
            <UploadFileIcon sx={{ fontSize: 36, color: file ? RED : "#bbb", mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.875rem", color: file ? "#111" : "#888" }}>
              {file ? file.name : "Click to select a file"}
            </Typography>
            {file && <Typography sx={{ fontSize: "0.75rem", color: "#888", mt: 0.25 }}>{(file.size / 1024).toFixed(1)} KB</Typography>}
            <input ref={fileRef} type="file" onChange={handleFile} style={{ display: "none" }} />
          </Box>
          <TextField label="Display Name" size="small" fullWidth value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <TextField label="Description (optional)" size="small" fullWidth multiline rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          <TextField label="Tag (optional)" size="small" fullWidth placeholder="e.g. Pending Review, 2025" value={tag} onChange={e => setTag(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained" onClick={handleUpload} disabled={!file || uploading}
          startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Edit document metadata dialog ────────────────────────────────────────────

function EditDocDialog({
  doc,
  allFolders,
  onClose,
  onSaved,
}: {
  doc: UploadedDoc
  allFolders: string[]
  onClose: () => void
  onSaved: (updated: UploadedDoc) => void
}) {
  const [displayName, setDisplayName] = useState(doc.display_name)
  const [description, setDescription] = useState(doc.description)
  const [tag, setTag] = useState(doc.tag)
  const [folderName, setFolderName] = useState(doc.folder_name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const updated = await updateDocument(doc.id, { display_name: displayName, description, tag, folder_name: folderName })
      onSaved(updated)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Save failed.")
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Document</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Display Name" size="small" fullWidth value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <TextField label="Description (optional)" size="small" fullWidth multiline rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          <TextField label="Tag (optional)" size="small" fullWidth placeholder="e.g. Pending Review, 2025" value={tag} onChange={e => setTag(e.target.value)} />
          <TextField
            label="Folder" size="small" fullWidth select value={folderName} onChange={e => setFolderName(e.target.value)}
            SelectProps={{ native: true }}
          >
            {Array.from(new Set([...allFolders, folderName])).map(f => <option key={f} value={f}>{f}</option>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained" onClick={handleSave} disabled={!displayName.trim() || saving}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Top-level upload button with folder selector ─────────────────────────────

function UploadButton({ folders, onSelect }: { folders: string[]; onSelect: (folder: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [customFolder, setCustomFolder] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const anchorRef = React.useRef<HTMLButtonElement>(null)

  return (
    <Box sx={{ position: "relative" }}>
      <Button
        ref={anchorRef}
        variant="contained"
        startIcon={<UploadFileIcon />}
        onClick={() => setMenuOpen(v => !v)}
        sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, fontSize: "0.82rem" }}
      >
        Upload Document
      </Button>
      {menuOpen && (
        <Box sx={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 10,
          bgcolor: "#fff", border: "1px solid #e4e4e7", borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 240, py: 0.5,
        }}>
          <Typography sx={{ px: 2, py: 0.75, fontSize: "0.7rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Select folder
          </Typography>
          {folders.map(f => (
            <Box key={f} onClick={() => { onSelect(f); setMenuOpen(false) }}
              sx={{ px: 2, py: 1, cursor: "pointer", fontSize: "0.85rem", "&:hover": { bgcolor: "#f4f4f5" }, display: "flex", alignItems: "center", gap: 1 }}>
              <FolderIcon sx={{ fontSize: 16, color: RED }} />
              {f}
            </Box>
          ))}
          <Box sx={{ borderTop: "1px solid #f0f0f0", mt: 0.5, pt: 0.5 }}>
            {!showCustom ? (
              <Box onClick={() => setShowCustom(true)}
                sx={{ px: 2, py: 1, cursor: "pointer", fontSize: "0.82rem", color: "#888", "&:hover": { bgcolor: "#f4f4f5" } }}>
                + New folder…
              </Box>
            ) : (
              <Box sx={{ px: 2, py: 1, display: "flex", gap: 1 }}>
                <TextField size="small" placeholder="Folder name" value={customFolder}
                  onChange={e => setCustomFolder(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && customFolder.trim()) { onSelect(customFolder.trim()); setMenuOpen(false); setShowCustom(false) } }}
                  sx={{ flex: 1, "& input": { fontSize: "0.82rem", py: 0.5 } }} autoFocus />
                <Button size="small" variant="contained" disabled={!customFolder.trim()}
                  onClick={() => { onSelect(customFolder.trim()); setMenuOpen(false); setShowCustom(false) }}
                  sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, minWidth: 0, px: 1 }}>
                  Go
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ── Folder card ───────────────────────────────────────────────────────────────

function FolderCard({
  folderName, description, staticFiles, uploadedDocs, query, onUpload, onDelete, onEdit,
}: {
  folderName: string
  description: string
  staticFiles: { name: string; filename: string; description: string; tag?: string }[]
  uploadedDocs: UploadedDoc[]
  query: string
  onUpload: () => void
  onDelete: (id: number) => void
  onEdit: (doc: UploadedDoc) => void
}) {
  const [open, setOpen] = useState(staticFiles.length + uploadedDocs.length > 0)

  const filteredStatic = staticFiles.filter(f =>
    !query || f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
  )
  const filteredUploaded = uploadedDocs.filter(f =>
    !query || f.display_name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
  )

  const totalFiles = staticFiles.length + uploadedDocs.length
  const totalShown = filteredStatic.length + filteredUploaded.length

  if (query && totalShown === 0) return null

  const extColor = (ext: string) => ext === "docx" || ext === "doc" ? "#1565c0" : RED

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden", mb: 2 }}>
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.75, cursor: "pointer", bgcolor: "#fafafa", borderBottom: open ? "1px solid #f0f0f0" : "none", "&:hover": { bgcolor: "#f4f4f5" } }}
      >
        <Box sx={{ color: RED, display: "flex" }}>{open ? <FolderOpenIcon /> : <FolderIcon />}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{folderName}</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{description}</Typography>
        </Box>
        <Chip label={`${totalFiles} file${totalFiles !== 1 ? "s" : ""}`} size="small"
          sx={{ bgcolor: "#f0f0f0", color: "#888", fontSize: "0.7rem", height: 20 }} />
        <Tooltip title="Upload file">
          <Box
            component="span"
            onClick={e => { e.stopPropagation(); onUpload() }}
            sx={{ color: "#aaa", display: "flex", cursor: "pointer", "&:hover": { color: RED } }}
          >
            <UploadFileIcon sx={{ fontSize: 18 }} />
          </Box>
        </Tooltip>
        {open ? <ExpandLessIcon sx={{ fontSize: 18, color: "#aaa" }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "#aaa" }} />}
      </Box>

      <Collapse in={open}>
        {totalShown === 0 ? (
          <Box sx={{ px: 2.5, py: 2, color: "#bbb", fontSize: "0.82rem" }}>No documents yet. Click the upload icon to add files.</Box>
        ) : (
          <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {/* Static (built-in) files */}
            {filteredStatic.map(file => (
              <Box key={file.filename} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, borderRadius: 1.5, border: "1px solid #f0f0f0", "&:hover": { bgcolor: "#fafafa", borderColor: "#e4e4e7" }, transition: "all 0.12s" }}>
                <DescriptionIcon sx={{ color: extColor(file.filename.split(".").pop() ?? ""), fontSize: 20, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{file.name}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{file.description}</Typography>
                </Box>
                {file.tag && <Chip label={file.tag} size="small" sx={{ bgcolor: "#f0f7ff", color: "#1565c0", fontSize: "0.68rem", height: 20, flexShrink: 0 }} />}
                <Tooltip title="Download">
                  <Box component="a" href={`/forms/${file.filename}`} download={file.name}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 1, color: "#888", flexShrink: 0, "&:hover": { bgcolor: `${RED}12`, color: RED }, transition: "all 0.12s" }}>
                    <DownloadIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Tooltip>
              </Box>
            ))}

            {/* Uploaded files */}
            {filteredUploaded.map(doc => (
              <Box key={doc.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, borderRadius: 1.5, border: "1px solid #f0f0f0", "&:hover": { bgcolor: "#fafafa", borderColor: "#e4e4e7" }, transition: "all 0.12s" }}>
                <DescriptionIcon sx={{ color: extColor(doc.extension), fontSize: 20, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{doc.display_name}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>
                    {doc.description || "Uploaded document"} · {doc.file_size > 0 ? `${(doc.file_size / 1024).toFixed(1)} KB` : ""}
                  </Typography>
                </Box>
                {doc.tag && <Chip label={doc.tag} size="small" sx={{ bgcolor: "#f0f7ff", color: "#1565c0", fontSize: "0.68rem", height: 20, flexShrink: 0 }} />}
                <Chip label="Uploaded" size="small" sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontSize: "0.65rem", height: 18, flexShrink: 0 }} />
                <Tooltip title="Download">
                  <Box component="a" href={doc.url} download={doc.display_name} target="_blank" rel="noopener noreferrer"
                    sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 1, color: "#888", flexShrink: 0, "&:hover": { bgcolor: `${RED}12`, color: RED }, transition: "all 0.12s" }}>
                    <DownloadIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Tooltip>
                <Tooltip title="Edit name / description / tag">
                  <Box onClick={() => onEdit(doc)}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 1, color: "#bbb", flexShrink: 0, cursor: "pointer", "&:hover": { bgcolor: "rgba(21,101,192,0.08)", color: "#1565c0" }, transition: "all 0.12s" }}>
                    <EditOutlinedIcon sx={{ fontSize: 17 }} />
                  </Box>
                </Tooltip>
                <Tooltip title="Delete">
                  <Box onClick={() => onDelete(doc.id)}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 1, color: "#ccc", flexShrink: 0, cursor: "pointer", "&:hover": { bgcolor: "rgba(196,18,48,0.08)", color: RED }, transition: "all 0.12s" }}>
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Collapse>
    </Paper>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [search, setSearch] = useState("")
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadFolder, setUploadFolder] = useState<string | null>(null)
  const [editDoc, setEditDoc] = useState<UploadedDoc | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = search.trim().toLowerCase()

  useEffect(() => {
    fetchUploaded()
      .then(setUploaded)
      .catch(() => setError("Failed to load uploaded documents."))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this document?")) return
    try {
      await deleteDocument(id)
      setUploaded(prev => prev.filter(d => d.id !== id))
    } catch { setError("Delete failed.") }
  }

  const handleSaved = (updated: UploadedDoc) => {
    setUploaded(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditDoc(null)
  }

  const totalFiles = STATIC_FOLDERS.reduce((s, f) => s + f.files.length, 0) + uploaded.length

  // All folder names (static + any uploaded to new folders)
  const dynamicFolders = Array.from(
    new Set(uploaded.map(d => d.folder_name).filter(n => !STATIC_FOLDERS.find(f => f.name === n)))
  )

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Documents & Bylaws</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          League bylaws, governing documents, All Star forms, and board reference materials.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField size="small" placeholder="Search by file name…" value={search} onChange={e => setSearch(e.target.value)}
          sx={{ maxWidth: 360 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#aaa", fontSize: 18 }} /></InputAdornment> }}
        />
        <Typography sx={{ fontSize: "0.8rem", color: "#aaa", flex: 1 }}>
          {totalFiles} file{totalFiles !== 1 ? "s" : ""} across {STATIC_FOLDERS.length + dynamicFolders.length} folders
        </Typography>
        {/* Upload button with folder chooser */}
        <UploadButton
          folders={[...STATIC_FOLDERS.map(f => f.name), ...dynamicFolders]}
          onSelect={folder => setUploadFolder(folder)}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} sx={{ color: RED }} /></Box>}

      {!loading && (
        <>
          {/* Built-in folders */}
          {STATIC_FOLDERS.map(folder => (
            <FolderCard
              key={folder.name}
              folderName={folder.name}
              description={folder.description}
              staticFiles={folder.files}
              uploadedDocs={uploaded.filter(d => d.folder_name === folder.name)}
              query={query}
              onUpload={() => setUploadFolder(folder.name)}
              onDelete={handleDelete}
              onEdit={setEditDoc}
            />
          ))}

          {/* Dynamic (upload-only) folders */}
          {dynamicFolders.map(name => (
            <FolderCard
              key={name}
              folderName={name}
              description="Custom folder"
              staticFiles={[]}
              uploadedDocs={uploaded.filter(d => d.folder_name === name)}
              query={query}
              onUpload={() => setUploadFolder(name)}
              onDelete={handleDelete}
              onEdit={setEditDoc}
            />
          ))}

          {query && STATIC_FOLDERS.every(f =>
            [...f.files, ...uploaded.filter(d => d.folder_name === f.name)].every(fi => {
              const n = "name" in fi ? fi.name : fi.display_name
              return !n.toLowerCase().includes(query)
            })
          ) && (
            <Box sx={{ textAlign: "center", py: 6, color: "#bbb" }}>
              <SearchIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography>No files match "{search}"</Typography>
            </Box>
          )}
        </>
      )}

      {uploadFolder && (
        <UploadDialog
          open
          folderName={uploadFolder}
          onClose={() => setUploadFolder(null)}
          onUploaded={doc => setUploaded(prev => [...prev, doc])}
        />
      )}

      {editDoc && (
        <EditDocDialog
          doc={editDoc}
          allFolders={[...STATIC_FOLDERS.map(f => f.name), ...dynamicFolders]}
          onClose={() => setEditDoc(null)}
          onSaved={handleSaved}
        />
      )}
    </Box>
  )
}

import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import { NAV_SECTIONS } from '../config/navConfig'

export default function SectionDashboardPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const section = NAV_SECTIONS.find(s => s.id === sectionId)

  if (!section) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: '#aaa' }}>
        <Typography>Section not found.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 32, bgcolor: section.color, borderRadius: 1, flexShrink: 0 }} />
          <Box sx={{ color: section.color, display: 'flex', fontSize: 28 }}>{section.icon}</Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#111' }}>
            {section.label}
          </Typography>
        </Box>
        <Typography sx={{ color: '#888', fontSize: '0.9rem', ml: '22px' }}>
          Select a page below or use the navigation panel on the left.
        </Typography>
      </Box>

      {/* Cards */}
      <Grid container spacing={2}>
        {section.items.map(({ label, path, icon, description }) => (
          <Grid item xs={12} sm={6} md={4} key={path}>
            <Paper
              component={Link}
              to={path}
              elevation={0}
              sx={{
                display: 'block',
                textDecoration: 'none',
                border: `1px solid ${section.color}20`,
                borderRadius: 2.5,
                p: 2.5,
                height: '100%',
                bgcolor: `${section.color}04`,
                transition: 'all 0.15s',
                '&:hover': {
                  borderColor: section.color,
                  bgcolor: `${section.color}0a`,
                  boxShadow: `0 4px 20px ${section.color}15`,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {/* Icon */}
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                bgcolor: `${section.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: section.color, mb: 1.5,
              }}>
                {icon}
              </Box>

              {/* Label + arrow */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#111', lineHeight: 1.3 }}>
                  {label}
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: 16, color: section.color, flexShrink: 0, mt: 0.2 }} />
              </Box>

              {/* Description */}
              <Typography sx={{ fontSize: '0.8rem', color: '#777', lineHeight: 1.5 }}>
                {description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

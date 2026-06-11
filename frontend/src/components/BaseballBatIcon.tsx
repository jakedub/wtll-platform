import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon'

/**
 * Baseball bat — diagonal silhouette, narrow handle bottom-left, barrel top-right.
 */
export default function BaseballBatIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Bat body: tapers from wide barrel (upper-right) to thin handle (lower-left) */}
      <path d="M3.5 20.5 L4.5 22 L6 20.5 L18.5 8 C20 6.5 20.5 4.5 19.5 3.5 C18.5 2.5 16.5 3 15 4.5 L3.5 17 L2 18.5 Z" />
      {/* Knob at handle end */}
      <ellipse cx="3.3" cy="20.5" rx="1.4" ry="0.9" transform="rotate(-45 3.3 20.5)" />
    </SvgIcon>
  )
}

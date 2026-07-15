/** @type {const} */
// Token values come from the official Last Bench brand kit
// (see assets/branding/brand-guide.png and design-system/tokens.json):
// Brand Green #00C853 · Charcoal #111111 · Warm White #FAFAF8
// Sage Green #E6F2E9 · Gray #6B6F76
const themeColors = {
  primary: { light: '#00C853', dark: '#00E676' },
  background: { light: '#FAFAF8', dark: '#0F2A1E' },
  surface: { light: '#ffffff', dark: '#132D1E' },
  foreground: { light: '#111111', dark: '#FAFAF8' },
  muted: { light: '#6B6F76', dark: '#A1A1AA' },
  border: { light: '#E6F2E9', dark: '#1e4030' },
  success: { light: '#22C55E', dark: '#4ADE80' },
  warning: { light: '#F59E0B', dark: '#FBBF24' },
  error: { light: '#EF4444', dark: '#F87171' },
};

module.exports = { themeColors };

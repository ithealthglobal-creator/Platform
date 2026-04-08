export interface GoogleFont {
  name: string
  category: 'sans-serif' | 'serif' | 'display' | 'monospace'
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Sans-serif
  { name: 'Poppins', category: 'sans-serif' },
  { name: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', category: 'sans-serif' },
  { name: 'Montserrat', category: 'sans-serif' },
  { name: 'Source Sans 3', category: 'sans-serif' },
  { name: 'Nunito', category: 'sans-serif' },
  { name: 'Raleway', category: 'sans-serif' },
  { name: 'Work Sans', category: 'sans-serif' },
  { name: 'DM Sans', category: 'sans-serif' },
  { name: 'IBM Plex Sans', category: 'sans-serif' },
  { name: 'Manrope', category: 'sans-serif' },
  { name: 'Space Grotesk', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif' },
  { name: 'Outfit', category: 'sans-serif' },
  { name: 'Sora', category: 'sans-serif' },
  { name: 'Figtree', category: 'sans-serif' },
  { name: 'Lexend', category: 'sans-serif' },
  { name: 'Urbanist', category: 'sans-serif' },
  { name: 'Rubik', category: 'sans-serif' },
  { name: 'Quicksand', category: 'sans-serif' },
  { name: 'Cabin', category: 'sans-serif' },
  { name: 'Josefin Sans', category: 'sans-serif' },
  { name: 'Karla', category: 'sans-serif' },
  { name: 'Mukta', category: 'sans-serif' },
  { name: 'Libre Franklin', category: 'sans-serif' },
  { name: 'PT Sans', category: 'sans-serif' },
  { name: 'Noto Sans', category: 'sans-serif' },
  { name: 'Barlow', category: 'sans-serif' },
  { name: 'Mulish', category: 'sans-serif' },
  { name: 'Albert Sans', category: 'sans-serif' },
  { name: 'Onest', category: 'sans-serif' },
  { name: 'Instrument Sans', category: 'sans-serif' },

  // Display
  { name: 'Exo 2', category: 'display' },
  { name: 'Red Hat Display', category: 'display' },
  { name: 'Geist', category: 'display' },

  // Serif
  { name: 'Playfair Display', category: 'serif' },
  { name: 'Merriweather', category: 'serif' },
  { name: 'Source Serif 4', category: 'serif' },
  { name: 'Lora', category: 'serif' },
  { name: 'Crimson Pro', category: 'serif' },
  { name: 'Bitter', category: 'serif' },
  { name: 'Libre Baskerville', category: 'serif' },
  { name: 'Spectral', category: 'serif' },
  { name: 'EB Garamond', category: 'serif' },
  { name: 'Cormorant Garamond', category: 'serif' },

  // Monospace
  { name: 'JetBrains Mono', category: 'monospace' },
  { name: 'Fira Code', category: 'monospace' },
  { name: 'IBM Plex Mono', category: 'monospace' },
  { name: 'Source Code Pro', category: 'monospace' },
]

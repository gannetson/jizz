/**
 * Colours from the React app (app/src/theme.ts) – primary/birdr ochre-brown palette.
 */
export const colors = {
  primary: {
    50: '#f5ede0',
    100: '#e8d4b8',
    200: '#d4b88a',
    300: '#c09c5c',
    400: '#ac802e',
    500: '#8b6419',
    600: '#6d4e14',
    700: '#4f380f',
    800: '#31220a',
    900: '#130c05',
  },
  error: {
    500: '#990000',
    50: '#ffe5e5',
  },
  success: {
    500: '#1a6b1a',
    50: '#d4e8d4',
  },
  warning: {
    500: '#cc6600',
    50: '#fff4e6',
  },
} as const;

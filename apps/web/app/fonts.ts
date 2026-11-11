/**
 * Self-hosted fonts via next/font/local.
 * Build-time Google fetches flake in CI ("Cannot read properties of null")
 * when fonts.google.com is unreachable — keep the look without the network.
 */
import localFont from 'next/font/local';

export const geistSans = localFont({
  src: [
    { path: './fonts/geist-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/geist-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const geistMono = localFont({
  src: [{ path: './fonts/geist-mono-latin-400-normal.woff2', weight: '400', style: 'normal' }],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const splashDisplay = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['Palatino Linotype', 'Palatino', 'Georgia', 'serif'],
});

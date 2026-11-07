import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serverer siden under /<repo-navn>/
const BASE = '/Oldefars-Hemmelighed/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ikon.svg'],
      manifest: {
        name: 'Oldefars Hemmelighed',
        short_name: 'Oldefar',
        description: 'Et slægtsforskningsspil på et skrivebord i Ribe.',
        lang: 'da',
        orientation: 'portrait',
        display: 'standalone',
        background_color: '#3b2a1e',
        theme_color: '#3b2a1e',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'ikon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'ikon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'ikon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mp3,ogg}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
}));

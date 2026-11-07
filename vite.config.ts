import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serverer siden under /<repo-navn>/
const BASE = '/Oldefars-Hemmelighed/';

// FORHAANDSVISNING=1 bygger en udgave med relative stier og uden service worker,
// som kan lægges op som forhåndsvisning andre steder end GitHub Pages.
const forhaand = !!process.env.FORHAANDSVISNING;

export default defineConfig(({ command }) => ({
  base: forhaand ? './' : command === 'build' ? BASE : '/',
  build: forhaand ? { outDir: 'dist-forhaand', modulePreload: false } : undefined,
  plugins: [
    preact(),
    !forhaand && VitePWA({
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

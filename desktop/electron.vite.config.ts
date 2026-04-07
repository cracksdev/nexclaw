import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/**
 * Vite adds `crossorigin` to script/link tags after `transformIndexHtml`. With
 * Electron `file://`, that can block ES module graphs. Strip in `generateBundle`
 * so the emitted `index.html` / `widget.html` are final.
 */
function stripCrossoriginFromBuiltHtml(): Plugin {
  return {
    name: 'nexclaw-strip-html-crossorigin',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const re = /\s+crossorigin(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g
      for (const output of Object.values(bundle)) {
        if (output.type === 'asset' && output.fileName.endsWith('.html') && typeof output.source === 'string') {
          output.source = output.source.replace(re, '')
        }
      }
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'preload/index.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'renderer'),
    plugins: [react(), tailwindcss(), stripCrossoriginFromBuiltHtml()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'renderer/index.html'),
          widget: resolve(__dirname, 'renderer/widget.html'),
        }
      }
    }
  }
})

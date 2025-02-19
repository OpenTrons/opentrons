/// <reference types="vitest" />
/// <reference types="vite/client" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import postCssImport from 'postcss-import'
import postCssApply from 'postcss-apply'
import postColorModFunction from 'postcss-color-mod-function'
import postCssPresetEnv from 'postcss-preset-env'
import lostCss from 'lost'

export default defineConfig({
  build: {
    // Relative to the root
    outDir: 'dist',
  },
  plugins: [
    react({
      include: '**/*.tsx',
      babel: {
        // Use babel.config.js files
        configFile: true,
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
    exclude: ['node_modules'],
  },
  css: {
    postcss: {
      plugins: [
        postCssImport({ root: 'src/' }),
        postCssApply(),
        postColorModFunction(),
        postCssPresetEnv({ stage: 0 }),
        lostCss(),
      ],
    },
  },
  define: {
    'process.env': process.env,
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@opentrons/components/styles': path.resolve(
        './components/src/index.module.css'
      ),
      '@opentrons/components': path.resolve('./components/src/index.ts'),
      '@opentrons/shared-data/pipette/fixtures/name': path.resolve(
        './shared-data/pipette/fixtures/name/index.ts'
      ),
      '@opentrons/shared-data/labware/fixtures/1': path.resolve(
        './shared-data/labware/fixtures/1/index.ts'
      ),
      '@opentrons/shared-data/labware/fixtures/2': path.resolve(
        './shared-data/labware/fixtures/2/index.ts'
      ),
      '@opentrons/shared-data': path.resolve('./shared-data/js/index.ts'),
      '@opentrons/step-generation': path.resolve(
        './step-generation/src/index.ts'
      ),
      '/app/': path.resolve('./app/src/') + '/',
      '/protocol-designer/': path.resolve('./protocol-designer/src/') + '/',
    },
  },
})

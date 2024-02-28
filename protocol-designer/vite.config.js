"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var postcss_import_1 = require("postcss-import");
var postcss_apply_1 = require("postcss-apply");
var postcss_color_mod_function_1 = require("postcss-color-mod-function");
var postcss_preset_env_1 = require("postcss-preset-env");
var lost_1 = require("lost");
exports.default = (0, vite_1.defineConfig)({
    // this makes imports relative rather than absolute
    base: '',
    build: {
        // Relative to the root
        outDir: 'dist',
    },
    plugins: [
        (0, plugin_react_1.default)({
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
    },
    css: {
        postcss: {
            plugins: [
                (0, postcss_import_1.default)({ root: 'src/' }),
                (0, postcss_apply_1.default)(),
                (0, postcss_color_mod_function_1.default)(),
                (0, postcss_preset_env_1.default)({ stage: 0 }),
                (0, lost_1.default)(),
            ],
        },
    },
    define: {
        'process.env': process.env,
        global: 'globalThis',
    },
    resolve: {
        alias: {
            '@opentrons/components/styles': path_1.default.resolve('../components/src/index.module.css'),
            '@opentrons/components': path_1.default.resolve('../components/src/index.ts'),
            '@opentrons/shared-data': path_1.default.resolve('../shared-data/js/index.ts'),
            '@opentrons/step-generation': path_1.default.resolve('../step-generation/src/index.ts'),
        },
    },
});

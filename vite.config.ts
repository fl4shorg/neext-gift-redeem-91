import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import obfuscator from "vite-plugin-javascript-obfuscator";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./", // Importante para HashRouter funcionar em subpastas
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5000,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false, // Desabilita source maps para segurança
    minify: 'esbuild', // Minificação rápida e eficiente
    rollupOptions: {
      output: {
        // Separação de chunks para melhor performance
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('/src/lib/crypto')) {
            return 'secure';
          }
          return undefined;
        },
      },
    },
    esbuild: {
      drop: ['console', 'debugger'], // Remove console.log e debugger em produção
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Obfuscação ULTRA AGRESSIVA - esconde tudo completamente
    mode === "production" && obfuscator({
      include: [
        "src/lib/crypto.ts",
        "src/lib/config.ts", 
        "src/components/GiftCardRedemption.tsx",
        "src/components/DevilFruitIcon.tsx",
        "src/lib/utils.ts"
      ],
      exclude: [/node_modules/, /\.d\.ts$/, /ui\//],
      apply: "build",
      options: {
        // MÁXIMA OBFUSCAÇÃO - Tudo habilitado
        compact: true,
        identifierNamesGenerator: 'mangled-shuffled',
        renameGlobals: true,
        
        // Arrays e strings embaralhados
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 5,
        stringArrayWrappersType: 'function',
        
        // Controle de fluxo complexo
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        
        // Injeção de código morto
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1,
        
        // Proteções máximas
        debugProtection: true,
        debugProtectionInterval: 2000,
        selfDefending: true,
        
        // Transformações avançadas
        transformObjectKeys: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        
        // Unicode e números
        unicodeEscapeSequence: true,
        numbersToExpressions: true,
        
        // Console e logs
        disableConsoleOutput: true,
        
        // Seed aleatório para máxima aleatoriedade
        seed: Math.floor(Math.random() * 100000),
        
        // Compactar variáveis
        reservedNames: [],
        reservedStrings: []
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

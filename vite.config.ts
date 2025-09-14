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
    // Obfuscação leve apenas para arquivos sensíveis
    mode === "production" && obfuscator({
      include: ["src/lib/crypto.ts"], // Apenas arquivos sensíveis
      exclude: [/node_modules/, /\.d\.ts$/],
      apply: "build",
      options: {
        // Configurações leves para performance
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: false, // Desabilitado para performance
        controlFlowFlattening: false, // Desabilitado para performance
        deadCodeInjection: false, // Desabilitado para performance
        debugProtection: false, // Desabilitado para performance
        selfDefending: false, // Desabilitado para performance
        transformObjectKeys: false, // Desabilitado para performance
        disableConsoleOutput: true, // Mantém para remover logs
        unicodeEscapeSequence: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

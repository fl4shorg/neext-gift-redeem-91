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
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "production" && obfuscator({
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      exclude: [/node_modules/, /\.d\.ts$/],
      apply: "build",
      options: {
        // Configurações de segurança máxima
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        
        // Proteção de strings
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,
        
        // Ofuscação de identificadores
        identifierNamesGenerator: 'hexadecimal',
        identifiersDictionary: [],
        identifiersPrefix: '',
        renameGlobals: false,
        renameProperties: false,
        
        // Anti-debug e segurança
        debugProtection: true,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        selfDefending: true,
        
        // Transformações de código
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        splitStrings: true,
        splitStringsChunkLength: 5,
        
        // Performance vs Segurança
        transformObjectKeys: true,
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

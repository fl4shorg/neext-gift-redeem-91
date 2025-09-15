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
    proxy: {
      '/api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
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
    // Obfuscação EXTREMA nos arquivos mais críticos
    mode === "production" && obfuscator({
      include: [
        "src/lib/crypto.ts",    // Funções de criptografia
        "src/lib/config.ts",    // URLs e chaves sensíveis  
        "src/components/GiftCardRedemption.tsx" // Componente principal com API calls
      ],
      exclude: [/node_modules/, /\.d\.ts$/, /ui\//],
      apply: "build",
      options: {
        // Configuração agressiva mas estável
        compact: true,
        identifierNamesGenerator: 'mangled-shuffled',
        
        // String obfuscation máximo
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        
        // Controle de fluxo moderado para compatibilidade
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        
        // Proteções importantes
        debugProtection: true,
        debugProtectionInterval: 4000,
        selfDefending: true,
        disableConsoleOutput: true,
        
        // String splitting para obscurecer URLs
        splitStrings: true,
        splitStringsChunkLength: 6,
        
        // Unicode encoding
        unicodeEscapeSequence: true,
        
        // Seed aleatório
        seed: Math.floor(Math.random() * 100000),
        
        // Preservar nomes essenciais do React
        reservedNames: [
          'React', 'ReactDOM', 'useState', 'useEffect', 'useCallback', 'useMemo',
          'document', 'window', 'console', 'setTimeout', 'setInterval', 'fetch',
          'import', 'export', 'default'
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        workbench: 'index.html',
        modelLab: 'model-lab.html',
        bedrockFidelity: 'bedrock-renderer.html',
        avatarLab: 'avatar-lab.html',
        coverRenderer: 'cover-renderer.html',
      },
    },
  },
});

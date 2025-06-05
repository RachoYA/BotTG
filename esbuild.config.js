import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  resolveExtensions: ['.ts', '.js', '.mts', '.mjs'],
  external: ['telegram'],
  alias: {
    'telegram/sessions': 'telegram/sessions/StringSession.js'
  },
  plugins: [{
    name: 'telegram-sessions-fix',
    setup(build) {
      build.onResolve({ filter: /^telegram\/sessions$/ }, args => {
        return { path: 'telegram/sessions/StringSession.js', external: true };
      });
    }
  }]
});
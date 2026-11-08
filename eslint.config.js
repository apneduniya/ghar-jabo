// Lint: TypeScript rules plus the one architectural rule that matters most:
// game logic (sim/) and data (content/) never touch three.js, rendering, the DOM-facing layers or the network.
import tseslint from 'typescript-eslint';

const viewLayers = ['three', 'three/*', '**/render/**', '**/ui/**', '**/audio/**', '**/input/**', '**/stages/**', '**/app/**'];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'research/**', 'tools/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/sim/**/*.ts', 'src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: viewLayers, message: 'sim/ and content/ must stay pure: no three.js, rendering, UI, audio or input imports.' }] }],
      'no-restricted-globals': ['error', 'window', 'document', 'performance', 'requestAnimationFrame', 'setTimeout', 'setInterval'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use the seeded Rng from sim/rng.ts.' }],
    },
  },
);

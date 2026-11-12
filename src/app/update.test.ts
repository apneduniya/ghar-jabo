import { describe, expect, it } from 'vitest';
import { entryScript } from './update';

describe('new-version check', () => {
  it('finds the hashed entry script in index.html and in a script path', () => {
    const html = '<script type="module" crossorigin src="/assets/index-DU8J8t5G.js"></script><link href="/assets/index-BBmTBbcA.css">';
    expect(entryScript(html)).toBe('/assets/index-DU8J8t5G.js');
    expect(entryScript('/assets/index-DU8J8t5G.js')).toBe('/assets/index-DU8J8t5G.js');
  });
  it('finds nothing on the dev server (unhashed /src/app/main.ts)', () => {
    expect(entryScript('<script type="module" src="/src/app/main.ts"></script>')).toBeNull();
  });
});

import js from '@eslint/js';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // The accessibility work in Phase 3 (skip link, labelled nav landmarks, aria-live regions,
      // role="img" on diagrams) was all done by hand and had nothing stopping it from regressing.
      // These rules catch the mechanical half of that automatically — a missing alt, a click
      // handler on a non-interactive element, an anchor with no href.
      ...jsxA11y.flatConfigs.recommended.rules,

      // The lab sliders wrap their <input> in a <label> whose text sits one level deeper than the
      // rule's default `depth: 2` — `label > div > span`. The association is valid HTML (implicit,
      // via wrapping) and the accessible name resolves correctly; only the static analysis stops
      // short. Raising the depth is the fix. Restructuring eleven working labels to satisfy a
      // default would be changing correct markup to please a linter.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],

      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);

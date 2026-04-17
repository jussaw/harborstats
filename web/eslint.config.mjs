import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import { configs as airbnb, plugins as airbnbPlugins } from 'eslint-config-airbnb-extended';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import prettier from 'eslint-config-prettier';

// airbnb-extended 3.1.0 references `react-hooks/component-hook-factories`,
// which was removed before eslint-plugin-react-hooks 7.1.0 stabilized.
// Shim the rule so config validation passes; the real rule is gone upstream.
const reactHooksShim = {
  ...reactHooks,
  rules: {
    ...reactHooks.rules,
    'component-hook-factories': { meta: { type: 'problem', schema: [] }, create: () => ({}) },
  },
};

const eslintConfig = defineConfig([
  airbnbPlugins.stylistic,
  airbnbPlugins.importX,
  airbnbPlugins.node,
  airbnbPlugins.react,
  airbnbPlugins.reactA11y,
  { name: 'react-hooks-shim', plugins: { 'react-hooks': reactHooksShim } },
  airbnbPlugins.next,
  airbnbPlugins.typescriptEslint,

  ...airbnb.base.all,
  ...airbnb.react.all,
  ...airbnb.next.all,

  {
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/globals.css',
      },
    },
    rules: betterTailwind.configs.recommended.rules,
  },

  prettier,

  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'import-x/prefer-default-export': 'off',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'function-declaration' },
      ],
    },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;

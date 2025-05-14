// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
// import reactRefresh from 'eslint-plugin-react-refresh'; // Likely not needed with Next.js

export default tseslint.config(
  // 1. Global ignores
  {
    ignores: [
      'node_modules/', // Standard ignore
      '.next/',        // Next.js build output
      'out/',          // Next.js static export output
      'build/',        // Common build output folder
      'dist/',         // Common distribution folder
      // Add any other specific files or folders you want ESLint to ignore globally
      // For example: 'public/some-generated-script.js'
    ]
  },

  // 2. ESLint recommended base for all JS/TS files
  js.configs.recommended,

  // 3. TypeScript ESLint recommended for all TS/TSX files
  // This spread applies to subsequent configurations unless overridden
  ...tseslint.configs.recommended,

  // 4. Configuration for Next.js specific rules (applies to .js, .jsx, .ts, .tsx)
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // You can add specific Next.js rule overrides here if needed
      // e.g., "@next/next/no-img-element": "warn",
    },
    languageOptions: {
      globals: {
        ...globals.browser, // For client-side code (pages, components)
        ...globals.node,    // For server-side code (API routes, getServerSideProps)
        React: 'readonly',   // Define React as a global
      },
    },
  },

  // 5. Configuration specifically for your TypeScript files (.ts, .tsx)
  // This includes React components and other TypeScript logic
  {
    files: ['src/**/*.{ts,tsx}'], // Adjust glob if your TS files are elsewhere
    languageOptions: {
      parser: tseslint.parser, // Explicitly use the TypeScript parser
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.eslint.json', // Path to your tsconfig.json
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin, // Ensure plugin is explicitly defined here
      'react-hooks': reactHooks,
      // 'react-refresh': reactRefresh, // Add back if specifically needed
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 'react-refresh/only-export-components': [ // If using react-refresh
      //   'warn',
      //   { allowConstantExport: true },
      // ],

      // Fix for unused vars, especially in catch blocks
      '@typescript-eslint/no-unused-vars': [
        'error', // Or 'warn'
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',          // Ignore variables starting with _
          argsIgnorePattern: '^_',          // Ignore arguments starting with _
          caughtErrors: 'all',              // Check all caught errors
          caughtErrorsIgnorePattern: '^_'   // Ignore caught errors starting with _
        }
      ],
      // Add any other specific TypeScript rule overrides here
      // e.g. "@typescript-eslint/explicit-function-return-type": "warn",
    },
    settings: { // Settings specific to plugins, e.g., react
        react: {
            version: 'detect', // Automatically detect the React version
        },
    },
  },

  // 6. Configuration for .cjs files (like postcss.config.cjs, tailwind.config.cjs)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node, // Provides 'module', 'require', '__dirname', etc.
      },
      sourceType: 'commonjs', // Explicitly tell ESLint these are CommonJS
    },
    rules: {
      // Turn off or adjust any rules that conflict with CommonJS syntax
      // For example, if you had rules enforcing ES module imports/exports.
      // The 'no-undef' for 'module' should be resolved by globals.node.
    }
  }
);
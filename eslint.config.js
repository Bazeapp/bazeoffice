import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'design-system']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useCarousel', 'useComboboxAnchor', 'useField'],
        },
      ],
    },
  },

  // Rule 1: board hooks must use the centralized mutation wrappers instead of
  // calling React Query's useMutation directly. The wrappers encode the rule
  // "don't invalidate the board on per-field saves" (it would cause a refetch
  // per keystroke).
  {
    files: [
      'src/hooks/use-*-board.ts',
      'src/hooks/use-*-data.ts',
      'src/hooks/use-*-pipeline.ts',
      'src/hooks/use-crm-*.ts',
    ],
    ignores: ['src/hooks/use-board-mutations.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              importNames: ['useMutation'],
              message:
                'Use useMoveMutation / usePatchMutation / useCreateMutation from @/hooks/use-board-mutations instead. The wrappers ensure per-keystroke saves never trigger a board refetch.',
            },
          ],
        },
      ],
    },
  },

  // Rule 2: components must not invalidate read caches directly. With React
  // Query as the source of truth, cache lifecycle is owned by queryClient /
  // hook abstractions, not by the components.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/anagrafiche-api',
              importNames: ['clearReadCaches'],
              message:
                'Do not invalidate read caches from components. Expose a callback on the hook or use queryClient.invalidateQueries.',
            },
          ],
        },
      ],
    },
  },

  // Rule 3a: legacy input pattern (useState + onBlur save) loses unsaved data
  // when the parent sheet closes before blur fires. Use DebouncedInput /
  // DebouncedTextarea, which flush on unmount via useDebouncedSave.
  // Currently a WARNING because there are ~35 pre-existing occurrences to
  // migrate gradually with per-file testing. New occurrences will still show
  // in IDE + CI logs. Promote to "error" once the existing debt is cleared.
  {
    files: ['src/components/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "JSXOpeningElement[name.name='Input']:has(JSXAttribute[name.name='onBlur'])",
          message:
            'Use <DebouncedInput committedValue={...} onSave={...}> instead of <Input ... onBlur=...>. The legacy pattern loses unsaved data when the sheet closes before onBlur fires.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='Textarea']:has(JSXAttribute[name.name='onBlur'])",
          message:
            'Use <DebouncedTextarea committedValue={...} onSave={...}> instead of <Textarea ... onBlur=...>.',
        },
      ],
    },
  },

  // Rule 3b: the outermost detail wrapper (rendered in *-view.tsx files,
  // where the selectedCardId/selectedRapportoId state lives) must declare a
  // `key` tied to the selected entity so debounced inputs inside reset their
  // local draft when switching record. Generic composites used as children of
  // a keyed parent are exempt.
  {
    files: ['src/components/**/*-view.tsx', 'src/pages/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.name=/Detail(Sheet|Panel|Shell)$/]:not(:has(JSXAttribute[name.name='key']))",
          message:
            'Detail wrappers (DetailSheet/DetailPanel/DetailShell) at the view level must declare key={selectedCardId ?? "__empty__"} so debounced inputs inside reset their local draft when switching cards.',
        },
      ],
    },
  },
])

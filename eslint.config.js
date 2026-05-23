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

  // Input / debounced-input rules (merged in one block to avoid
  // no-restricted-syntax overrides between configs).
  // Severity: "warn" because some selectors flag pre-existing debt we migrate
  // gradually. New occurrences still surface in IDE + CI logs. Promote to
  // "error" once the existing debt is cleared.
  {
    files: ['src/components/**/*.tsx', 'src/pages/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          // Legacy: useState + onBlur save loses unsaved data when the
          // parent sheet closes before blur fires. Use DebouncedInput.
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
        {
          // A transient `disabled` (true during save) forces the browser to
          // fire blur and kicks the user out of the field mid-typing.
          selector:
            "JSXOpeningElement[name.name='DebouncedInput'] > JSXAttribute[name.name='disabled']",
          message:
            'Do not pass `disabled` to DebouncedInput. A transient disable during save kicks focus out mid-typing. Multiple in-flight saves are fine (last write wins). For permanent disable (permissions), suppress this rule per-line with an explanation.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='DebouncedTextarea'] > JSXAttribute[name.name='disabled']",
          message:
            'Do not pass `disabled` to DebouncedTextarea. A transient disable during save kicks focus out mid-typing.',
        },
        {
          // Catch hand-rolled "debounced autosave" patterns: an <Input> whose
          // `disabled` prop is derived from a "saving" state variable. The
          // pattern looks fine but causes focus loss mid-typing.
          // Prefer <DebouncedInput committedValue=... onSave=...> instead.
          selector:
            "JSXOpeningElement[name.name='Input'] > JSXAttribute[name.name='disabled'] > JSXExpressionContainer BinaryExpression > Identifier[name=/^(saving|isSaving)/i]",
          message:
            'Looks like a hand-rolled debounced save (Input with `disabled` tied to a `savingX` state). Use <DebouncedInput committedValue={...} onSave={...}> which handles debounce + flush + anti-focus-loss centrally.',
        },
        {
          // Detail wrappers must declare a `key` tied to the selected entity
          // so debounced inputs inside reset their local draft when switching
          // record. The rule only fires for top-level wrappers (in *-view
          // files); generic composites used as children of a keyed parent
          // are not matched here.
          selector:
            "Program > :matches(FunctionDeclaration, VariableDeclaration) JSXOpeningElement[name.name=/Detail(Sheet|Panel|Shell)$/]:not(:has(JSXAttribute[name.name='key']))",
          message:
            'Detail wrappers (DetailSheet/DetailPanel/DetailShell) at the view level must declare key={selectedCardId ?? "__empty__"} so debounced inputs inside reset their local draft when switching cards.',
        },
      ],
    },
  },
])

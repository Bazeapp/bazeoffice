---
name: module-based-development
description: Guidelines on how to develop a project using a module-based approach. Features are separated in scopes located in the `modules/` directory. Use this when working on a new or existing feature or functionality of the application.
---

# Module-based Development

## Rules

- A module is a self-contained unit of code that encapsulates a specific functionality or feature of the application.
- A module should be reusable and should be able to be used in other parts of the application.
- A module should have a clear purpose but shoudn't be too specific. Examples of modules are:
  - `auth` - for authentication functionality
  - `users` - for user management functionality
  - `products` - for product management functionality
  - `orders` - for order management functionality
  - `payments` - for payment management functionality
  - `shipping` - for shipping management functionality
  - `inventory` - for inventory management functionality
  - `reports` - for reporting functionality
  - `settings` - for settings functionality
  - `dashboard` - for dashboard functionality
  - `storage` - for storage functionality
  - `admin` - for administration functionality
  - `i18n` - for internationalization functionality
  - `notifications` - for notifications functionality
  - `analytics` - for analytics functionality
  - `monitoring` - for monitoring functionality
  - `documentation` - for documentation functionality
  - `store` - for shop/subscriptions functionality
- A module should be placed in the `modules/` directory or  `src/modules/` directory depending on the project structure.

## File structure

- Root folder: `modules/module-name`
- Sub folders:
  - `components` - for components
  - `hooks` - for hooks
  - `lib` - for utility functions
    - `lib/consts.ts` - for constants specific to the module
    - `lib/utils.ts` - for utility functions specific to the module
  - `schemas` - for schemas specific to the module
  - `plugins` - for custom plugins specific to a framework used (example BetterAuth, PlateJS, etc.)
  - `server` - for server-side code
    - `server/hooks/` - for client side server hooks (using Tanstack Query/Mutation)
    - `server/queries/` - for queries specific to the module
    - `server/actions/` - for actions specific to the module
  - `stores` - for state/context management
    - `stores/*-context.ts` - for react context
    - `stores/*-store.ts` - for zustand store
    - `stores/*-state.ts` - for nanostore atom
  - `types` - for type definitions
  - `tests` - for tests


## Important rules

- never use utility functions inside a component, move it to the `lib/utils.ts` file or to a more specific file if needed. Some examples might be:
  - `lib/format.ts`
  - `lib/session.ts`
  - `lib/api.ts`
  - `lib/mail.ts`
  - `lib/cache.ts`
  - `lib/transforms.ts`
  - `lib/conversions.ts`
- keep the naming convention as generic as possible, avoid using specific names for the utils.
- always put hardcoded constant values in the `lib/consts.ts`
- if a constant must be shown on the frontend create a dictionary with label in the `lib/consts.ts` if single language, or add proper translations in `i18n/` folder if multi-language is needed.

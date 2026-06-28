```markdown
# translate-desk Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `translate-desk` repository, a TypeScript project scaffolded with Vite. You'll learn about file naming, import/export styles, and how to write and organize tests. While no automated workflows were detected, this guide includes suggested commands to streamline common development tasks.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `translateUtils.ts`, `mainComponent.tsx`

### Import Style
- Use **relative imports** for all modules.
  - Example:
    ```typescript
    import { translateText } from './translateUtils';
    ```

### Export Style
- Use **named exports** exclusively.
  - Example:
    ```typescript
    // In translateUtils.ts
    export function translateText(text: string): string {
      // ...
    }
    ```

    ```typescript
    // In another file
    import { translateText } from './translateUtils';
    ```

### Commit Messages
- Freeform, short messages (average ~21 characters).
- No strict prefix or type required.

## Workflows

### Development Setup
**Trigger:** When starting development or setting up the project for the first time  
**Command:** `/setup`

1. Clone the repository.
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the development server:
    ```bash
    npm run dev
    ```

### Adding a New Feature
**Trigger:** When implementing a new feature  
**Command:** `/add-feature`

1. Create a new file using camelCase naming.
2. Use relative imports to include dependencies.
3. Use named exports for all functions/components.
4. Write or update tests in a corresponding `*.test.*` file.
5. Commit changes with a concise, descriptive message.

### Running Tests
**Trigger:** To verify code correctness  
**Command:** `/test`

1. Locate test files matching the `*.test.*` pattern.
2. Run the test suite (framework not specified; commonly, use):
    ```bash
    npm test
    ```
3. Review test results and fix any failing tests.

## Testing Patterns

- Test files follow the `*.test.*` naming convention (e.g., `translateUtils.test.ts`).
- Place tests alongside the files they cover or in a dedicated test directory.
- Testing framework is unspecified; use typical TypeScript/Vite-compatible frameworks (e.g., Vitest, Jest).

**Example:**
```typescript
// translateUtils.test.ts
import { translateText } from './translateUtils';

test('translates text correctly', () => {
  expect(translateText('hello')).toBe('hola');
});
```

## Commands
| Command      | Purpose                                  |
|--------------|------------------------------------------|
| /setup       | Set up the project for development       |
| /add-feature | Scaffold and implement a new feature     |
| /test        | Run the test suite                      |
```

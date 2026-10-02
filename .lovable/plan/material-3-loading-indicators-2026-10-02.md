# Material 3 loading indicators

## Changes
- Install the requested `@m3e/web` module and load its loading-indicator registration once in the shared app shell.
- Add React/TypeScript support for the `<m3e-loading-indicator>` custom element.
- Replace every visible spinner used for loading, saving, uploading, deleting, or generating with the Material 3 loading indicator.
- Use `variant="contained"` inside prominent filled controls, and the default variant for inline or page-level loading states.
- Preserve non-loading animated icons and existing button behavior.

## Validation
- Check all source files for remaining spinner-based loading indicators.
- Verify the preview builds successfully and inspect representative page-level and button loading states.

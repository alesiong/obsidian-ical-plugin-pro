/**
 * Shim for Obsidian's activeDocument API (added in 1.1.0).
 * Falls back to global `document` at runtime in non-Obsidian contexts (tests).
 */
export const activeDocument: Document = (globalThis as unknown as Record<string, unknown>).activeDocument as Document ?? document;

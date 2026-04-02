interface TruncateOptions {
  maxChars: number;
  contextLines: number;
}

const DEFAULTS: TruncateOptions = {
  maxChars: 4000,
  contextLines: 50,
};

/**
 * Truncates content to maxChars.
 * If filepath is provided, searches content for `filepath:(\d+)` error references
 * and prioritizes that line's surrounding context (±contextLines) in the output.
 * Falls back to simple front-truncation when no error line is detected.
 */
export function smartTruncate(
  content: string,
  filepath?: string,
  options?: Partial<TruncateOptions>,
): string {
  const { maxChars, contextLines } = { ...DEFAULTS, ...options };

  if (content.length <= maxChars) return content;

  if (filepath) {
    const escaped = filepath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const errorLineMatch = content.match(new RegExp(`${escaped}:(\\d+)`));
    if (errorLineMatch) {
      const targetLine = parseInt(errorLineMatch[1], 10) - 1; // 0-indexed
      const lines = content.split('\n');
      const start = Math.max(0, targetLine - contextLines);
      const end = Math.min(lines.length, targetLine + contextLines + 1);
      const errorSection = lines.slice(start, end).join('\n');

      if (errorSection.length <= maxChars) {
        const remaining = maxChars - errorSection.length - 50;
        if (remaining > 0 && start > 0) {
          const headLines = Math.min(start, Math.floor(remaining / 80));
          const head = lines.slice(0, headLines).join('\n');
          if (head) {
            return head + '\n...\n' + errorSection + (end < lines.length ? '\n...(truncated)' : '');
          }
        }
        return errorSection + (end < lines.length ? '\n...(truncated)' : '');
      }
      return errorSection.slice(0, maxChars) + '\n...(truncated)';
    }
  }

  return content.slice(0, maxChars) + '\n...(truncated)';
}

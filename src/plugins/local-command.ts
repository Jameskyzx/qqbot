export interface ParsedLocalCommand {
  file: string;
  args: string[];
}

export function parseLocalCommand(command: string): ParsedLocalCommand | null {
  const input = command.trim();
  if (!input) return null;

  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];
    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }
    if (ch === '\\' && quote !== "'" && (next === '"' || next === '\\')) {
      escaping = true;
      continue;
    }
    if ((ch === '"' || ch === "'") && (!quote || quote === ch)) {
      quote = quote ? null : ch;
      continue;
    }
    if (!quote && /\s/.test(ch)) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (escaping) current += '\\';
  if (current) parts.push(current);

  if (parts.length === 0 || !parts[0]) return null;
  return { file: parts[0], args: parts.slice(1) };
}

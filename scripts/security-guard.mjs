#!/usr/bin/env node
// PreToolUse hook — Allowlist-first security guard
// v0.3: ksk core commands bypass pattern check, only truly destructive ops are blocked

let input = '';

process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolName = data.tool_name || '';
  const toolInput = data.tool_input || {};

  if (toolName === 'Bash') {
    const cmd = toolInput.command || '';

    // --- Allowlist: ksk core and common dev commands always pass ---
    const allowed = [
      /^codex\b/,           // codex exec, codex --version
      /^gemini\b/,          // gemini -p, gemini --version
      /^which\b/,           // CLI detection
      /^node\b/,            // node scripts
      /^npm\b/,             // npm install/test/run
      /^npx\b/,             // npx vitest, etc.
      /^python[3]?\b/,      // python scripts
      /^git\s+(status|log|diff|add|commit|push|pull|fetch|branch|remote|stash|checkout|switch|tag|show|merge|rebase)\b/,
      /^find\b/,            // find files
      /^ls\b/,              // list directory
      /^cat\b/,             // read file
      /^head\b/,            // read file head
      /^tail\b/,            // read file tail
      /^mkdir\b/,           // create directory
      /^cp\b/,              // copy files
      /^mv\b/,              // move files (with caution below)
      /^echo\b/,            // echo output
      /^test\b/,            // shell test
      /^pgrep\b/,           // process grep
      /^ps\b/,              // process list
    ];
    for (const pattern of allowed) {
      if (pattern.test(cmd)) {
        process.exit(0); // Allow without further checks
      }
    }

    // --- Blocklist: truly destructive commands ---
    const dangerous = [
      /\brm\s+-rf\s+[/~]/,                    // rm -rf / or rm -rf ~
      /\brm\s+-rf\s+\.\./,                     // rm -rf ..
      /\bgit\s+push\s+.*--force/,              // git push --force
      /\bgit\s+push\s+.*-f\b/,                 // git push -f
      /\bgit\s+reset\s+--hard/,                // git reset --hard
      /\bgit\s+clean\s+-f/,                    // git clean -f
      /\bDROP\s+(TABLE|DATABASE)/i,            // SQL DROP
      /\bchmod\s+-R\s+777/,                    // chmod 777 recursively
      /\bchmod\s+-R\s+000/,                    // chmod 000 recursively
      />\s*\/dev\/sd[a-z]/,                    // Write to disk device
      /\bdd\s+if=.*of=\/dev\//,                // dd to device
      /\bmkfs\b/,                              // Format filesystem
      /\bcurl\b.*\|\s*(ba)?sh/,                // Curl pipe to shell
      /\bwget\b.*\|\s*(ba)?sh/,                // Wget pipe to shell
      /:\(\)\{\s*:\|:&\s*\}\s*;/,              // Fork bomb
    ];
    for (const pattern of dangerous) {
      if (pattern.test(cmd)) {
        process.stdout.write(JSON.stringify({
          decision: 'block',
          reason: `[KSK Security] Destructive command blocked: ${cmd.slice(0, 80)}\nReview and run manually if intended.`,
        }));
        process.exit(0);
      }
    }
  }

  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = toolInput.file_path || '';
    const sensitivePatterns = [/\.env(\.\w+)?$/, /credentials/, /secrets/, /\.pem$/, /\.key$/, /id_rsa/, /id_ed25519/];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(filePath)) {
        process.stdout.write(`<system-reminder>[KSK Security] Writing to sensitive file: ${filePath}. Ensure no secrets are hardcoded.</system-reminder>`);
        process.exit(0);
      }
    }
  }

  // Allow everything else
  process.exit(0);
});

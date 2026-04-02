#!/usr/bin/env node
// PostToolUse hook — tracks modified files in session

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const TRACK_FILE = '.ksk/modified_files.json';

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
  const toolResponse = data.tool_response || {};
  const toolInput = data.tool_input || {};

  if ((toolName === 'Write' || toolName === 'Edit') && !toolResponse.isError) {
    const filePath = toolInput.file_path;
    if (!filePath) {
      process.exit(0);
    }

    try {
      let entries = [];
      if (existsSync(TRACK_FILE)) {
        try {
          entries = JSON.parse(readFileSync(TRACK_FILE, 'utf-8'));
        } catch {
          entries = [];
        }
      }

      const now = new Date().toISOString();
      const existing = entries.findIndex((e) => e.path === filePath);
      if (existing >= 0) {
        entries[existing] = { path: filePath, last_modified: now };
      } else {
        entries.push({ path: filePath, last_modified: now });
      }

      // Cap at 500 entries
      if (entries.length > 500) {
        entries = entries.slice(-500);
      }

      mkdirSync(dirname(TRACK_FILE), { recursive: true });
      writeFileSync(TRACK_FILE, JSON.stringify(entries, null, 2), 'utf-8');
    } catch {
      // Non-critical — ignore write failures
    }
  }

  process.exit(0);
});

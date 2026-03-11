#!/bin/bash
cd "/Users/justinglaser/Desktop/VS Code/CDA" || exit 1

# Start Vite dev server in background and log output
npm run dev &> "$HOME/.cda_vite.log" &

# Wait for the server to become available then open the browser
for i in {1..20}; do
  if curl -s --max-time 1 http://127.0.0.1:5173/ >/dev/null; then
    open "http://127.0.0.1:5173/"
    exit 0
  fi
  sleep 1
done

# Fallback: open the browser anyway
open "http://127.0.0.1:5173/"
exit 0

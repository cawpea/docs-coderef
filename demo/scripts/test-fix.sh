#!/bin/bash

# Script to test the fix command on demo documentation
# Run from project root: ./demo/scripts/test-fix.sh

echo "================================"
echo "Building project..."
echo "================================"
npm run build

if [ $? -ne 0 ]; then
  echo "Build failed! Exiting."
  exit 1
fi

echo ""
echo "================================"
echo "Running fix command (interactive mode with backup)..."
echo "================================"
npx docs-coderef fix --backup

echo ""
echo "================================"
echo "Fix complete!"
echo "================================"
echo "To reset demo files, run: ./demo/scripts/reset-demo.sh"

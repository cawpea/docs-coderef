#!/bin/bash

# Script to reset demo files to original state
# Run from project root: ./demo/scripts/reset-demo.sh

echo "================================"
echo "Resetting demo files to original state..."
echo "================================"

git checkout demo/docs/

if [ $? -eq 0 ]; then
  echo "✓ Demo documentation files reset successfully!"
else
  echo "✗ Failed to reset demo files."
  echo "  Make sure you're in a git repository and have demo/docs/ committed."
  exit 1
fi

# Remove any backup files
if ls demo/docs/**/*.backup 1> /dev/null 2>&1; then
  echo "Removing backup files..."
  rm demo/docs/**/*.backup
  echo "✓ Backup files removed"
fi

echo ""
echo "================================"
echo "Demo reset complete!"
echo "================================"

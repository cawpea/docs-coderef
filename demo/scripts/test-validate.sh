#!/bin/bash

# Script to validate demo documentation
# Run from project root: ./demo/scripts/test-validate.sh

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
echo "Validating demo documentation..."
echo "================================"
npx docs-coderef validate demo/docs --verbose

echo ""
echo "================================"
echo "Validation complete!"
echo "================================"

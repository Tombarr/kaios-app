#!/bin/bash
set -e

# Default to current directory if not in /app
BASE_DIR=$(pwd)
if [ "$BASE_DIR" = "/" ]; then
    BASE_DIR="/app"
fi

echo "Building database..."
cd "$BASE_DIR/data"

if [ -f "devices.json" ]; then
    echo "Skipping device fetch (devices.json exist)"
else
    node devices.js
fi

if [ -f "apps.db" ]; then
    echo "Skipping app fetch (apps.db exists)"
else
    node local.js
fi

echo "Building website..."
cd "$BASE_DIR/src"
npx tsx gensite.ts ../data/apps.db ../data/devices.json

echo "Website generated in $BASE_DIR/src/gen"

# Output directory handling
OUTPUT_DIR="$BASE_DIR/output"

# If /output exists (Docker mount), use that instead
if [ -d "/output" ]; then
    OUTPUT_DIR="/output"
fi

mkdir -p "$OUTPUT_DIR"
cp -r "$BASE_DIR/src/gen/"* "$OUTPUT_DIR/"
echo "Copied to $OUTPUT_DIR"


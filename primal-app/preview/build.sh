#!/bin/bash
# Builds the shareable web preview into preview-build/ (relative paths, works from any URL).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -r "$ROOT/src" "$ROOT/assets" "$ROOT/preview" "$ROOT/app.json" "$ROOT/tsconfig.json" "$TMP/"
ln -s "$ROOT/node_modules" "$TMP/node_modules"
node -e "const p=require('$ROOT/package.json');p.main='preview/entry.js';require('fs').writeFileSync('$TMP/package.json',JSON.stringify(p,null,2))"
node -e "const a=require('$TMP/app.json');a.expo.plugins=a.expo.plugins.filter(p=>p!=='expo-router');a.expo.name='VISOLIS';require('fs').writeFileSync('$TMP/app.json',JSON.stringify(a,null,2))"
(cd "$TMP" && CI=1 npx expo export --platform web --output-dir out --clear >/dev/null)
rm -rf "$ROOT/preview-build" && mv "$TMP/out" "$ROOT/preview-build"
cd "$ROOT/preview-build"
# Absolute paths → relative, so the build works below any path.
sed -i 's#src="/_expo/#src="./_expo/#g; s#href="/#href="./#g' index.html
find _expo -name '*.js' -exec sed -i 's#"/assets/#"./assets/#g; s#"/_expo/#"./_expo/#g' {} +
echo "Preview built in $ROOT/preview-build"

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * Web preview: Skia runs on CanvasKit (WebAssembly), which must be loaded first.
 * `npm run web` copies canvaskit.wasm into public/ (see package.json).
 */
export default function NeonBackground() {
  return <WithSkiaWeb
    opts={{ locateFile: (file: string) => `${(globalThis as { __PRIMAL_BASE__?: string }).__PRIMAL_BASE__ ?? '/'}${file}` }}
    getComponent={() => import('./NeonField')}
    fallback={<View style={[StyleSheet.absoluteFill, { backgroundColor: '#050505' }]} />}
  />;
}

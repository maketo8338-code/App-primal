import React from 'react';
import { Text as NativeText } from 'react-native';
import type { TextProps } from 'react-native';
import { useI18n } from '../lib/i18n';

function translateChildren(children: React.ReactNode, translate: (value: string) => string): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      const trimmed = child.trim();
      if (!trimmed) return child;
      const translated = translate(trimmed);
      return child === trimmed ? translated : child.replace(trimmed, translated);
    }
    if (Array.isArray(child)) return translateChildren(child, translate);
    return child;
  });
}

export function I18nText({ children, accessibilityLabel, ...props }: TextProps) {
  const { t } = useI18n();
  const translatedLabel = accessibilityLabel ? t(accessibilityLabel) : accessibilityLabel;
  return (
    <NativeText {...props} accessibilityLabel={translatedLabel}>
      {translateChildren(children, t)}
    </NativeText>
  );
}

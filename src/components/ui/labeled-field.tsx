import { StyleSheet, View, type TextInputProps } from 'react-native';

import { spacing } from '@/theme/tokens';

import { AppText } from './app-text';
import { TextField } from './text-field';

/** Eingabefeld mit Beschriftung und optionaler Fehlermeldung. */
export function LabeledField({
  label,
  error,
  suffix,
  style,
  ...input
}: TextInputProps & { label: string; error?: string; suffix?: string }) {
  return (
    <View style={[styles.wrap, style]}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <TextField invalid={!!error} suffix={suffix} accessibilityLabel={label} {...input} />
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
});

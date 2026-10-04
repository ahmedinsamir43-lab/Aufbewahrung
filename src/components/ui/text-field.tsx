import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './app-text';

export const TextField = forwardRef<
  TextInput,
  TextInputProps & { suffix?: string; large?: boolean; invalid?: boolean }
>(function TextField({ suffix, large = false, invalid = false, style, onFocus, onBlur, ...rest }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = invalid ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor, minHeight: large ? 76 : 56 },
      ]}>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          large ? styles.inputLarge : typography.body,
          styles.input,
          { color: colors.text },
          Platform.OS === 'web' && styles.noOutline,
          style,
        ]}
        {...rest}
      />
      {suffix ? (
        <AppText variant={large ? 'title' : 'bodyStrong'} color="textTertiary">
          {suffix}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + spacing.xs,
    gap: spacing.sm,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  // Browser-Fokusrahmen nur in der Web-Vorschau ausblenden; der Rahmen der Box zeigt den Fokus.
  noOutline: { outlineStyle: 'none' } as object,
  inputLarge: { ...typography.display, fontSize: 32, lineHeight: 40 },
});

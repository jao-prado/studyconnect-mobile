import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';
import { controls, radii, spacing, type } from '../theme/tokens';

export const FormInput = forwardRef(function FormInput({ label, error, hint, invalid = false, inputStyle, secureTextEntry = false, onFocus, onBlur, ...props }, ref) {
  const [passwordHidden, setPasswordHidden] = useState(secureTextEntry);
  const [focused, setFocused] = useState(false);
  const isInvalid = Boolean(error) || invalid;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.frame, focused ? styles.frameFocused : null, isInvalid ? styles.frameError : null, props.editable === false ? styles.frameReadOnly : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={props.accessibilityLabel || label}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          secureTextEntry={secureTextEntry && passwordHidden}
          style={[styles.input, secureTextEntry ? styles.inputWithAction : null, inputStyle]}
          underlineColorAndroid="transparent"
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={passwordHidden ? 'Mostrar senha' : 'Ocultar senha'}
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => setPasswordHidden((current) => !current)}
            style={({ pressed }) => [styles.passwordAction, pressed ? styles.passwordActionPressed : null]}
          >
            <Ionicons color={colors.textSecondary} name={passwordHidden ? 'eye-outline' : 'eye-off-outline'} size={21} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

export const CodeInput = forwardRef(function CodeInput({ label = 'Código de verificação', value = '', onChangeText, invalid = false, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || ' ');
  const activeIndex = Math.min(value.length, 5);

  return (
    <View style={styles.codeWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.codeField}>
        <View importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.codeCells}>
          {digits.map((digit, index) => (
            <View
              key={index}
              style={[
                styles.codeCell,
                focused && index === activeIndex ? styles.codeCellFocused : null,
                invalid ? styles.codeCellError : null,
              ]}
            >
              <Text style={styles.codeDigit}>{digit}</Text>
            </View>
          ))}
        </View>
        <TextInput
          ref={ref}
          accessibilityLabel={`${label}, seis dígitos`}
          autoCapitalize="none"
          autoComplete="one-time-code"
          autoCorrect={false}
          caretHidden
          keyboardType="number-pad"
          maxLength={6}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          onChangeText={(text) => onChangeText?.(text.replace(/\D/g, '').slice(0, 6))}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          selectionColor="transparent"
          style={styles.codeNativeInput}
          textContentType="oneTimeCode"
          underlineColorAndroid="transparent"
          value={value}
          {...props}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { color: colors.text, ...type.label },
  frame: {
    minHeight: controls.inputHeight,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  frameError: { borderColor: colors.danger },
  frameFocused: { borderColor: colors.primary },
  frameReadOnly: { opacity: 0.7 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: controls.inputHeight - 2,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputWithAction: { paddingRight: spacing.sm },
  passwordAction: {
    minWidth: controls.minTouch,
    minHeight: controls.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: radii.sm,
    marginRight: spacing.xs,
  },
  passwordActionPressed: { backgroundColor: colors.surfacePressed },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  codeWrapper: { gap: spacing.sm },
  codeField: { position: 'relative', minHeight: 56 },
  codeCells: { flexDirection: 'row', gap: spacing.sm },
  codeCell: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCellFocused: { borderColor: colors.primary },
  codeCellError: { borderColor: colors.danger },
  codeDigit: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: '700', fontVariant: ['tabular-nums'] },
  codeNativeInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
    padding: 0,
  },
});

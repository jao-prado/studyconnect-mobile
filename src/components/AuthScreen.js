import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { controls, radii, spacing } from '../theme/tokens';

export function AuthScreen({ title, subtitle, icon, children, footer, centered = false, backTo = '/boas-vindas', onBack }) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? spacing.lg : spacing.xl;

  function handleBack() {
    if (onBack) onBack();
    else router.replace(backTo);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Voltar"
              accessibilityRole="button"
              hitSlop={4}
              onPress={handleBack}
              style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}
            >
              <Ionicons color={colors.primaryText} name="chevron-back" size={22} />
            </Pressable>
          </View>

          <View style={[styles.header, centered ? styles.headerCentered : null]}>
            {icon ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconBadge}><Ionicons color={colors.primary} name={icon} size={28} /></View> : null}
            <Text style={[styles.title, centered ? styles.centeredText : null]}>{title}</Text>
            <Text style={[styles.subtitle, centered ? styles.centeredText : null]}>{subtitle}</Text>
          </View>

          <View style={styles.content}>{children}</View>
          {footer ? (
            <View style={styles.footer}>
              {typeof footer === 'string' ? <Text style={styles.footerText}>{footer}</Text> : footer}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  linkButton: { minHeight: controls.minTouch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  link: { color: colors.primaryText, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  linkPrefix: { color: colors.textSecondary, fontWeight: '400' },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: -spacing.sm },
  context: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  contextCentered: { alignItems: 'center', borderLeftWidth: 0, paddingLeft: 0 },
  contextLabel: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  contextValue: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 2 },
  contextValueCentered: { textAlign: 'center' },
  codeInput: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: 7, textAlign: 'center' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: controls.contentMaxWidth,
    alignSelf: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    minHeight: controls.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButton: {
    minWidth: controls.minTouch,
    minHeight: controls.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    marginLeft: -spacing.md,
  },
  backButtonPressed: { backgroundColor: colors.surface },
  header: { marginTop: spacing.xxl },
  headerCentered: { alignItems: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.xl },
  iconBadge: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: colors.primarySoft, marginBottom: spacing.lg },
  centeredText: { textAlign: 'center' },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.3, marginTop: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontWeight: '400', marginTop: spacing.sm },
  content: { gap: spacing.md, marginTop: spacing.xl },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});

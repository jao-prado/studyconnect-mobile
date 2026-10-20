import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

export function AuthScreen({ eyebrow, title, subtitle, children, footer }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
            <Text style={styles.brandName}>StudyConnect</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <View style={styles.content}>{children}</View>
          </View>
          {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  message: { borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, backgroundColor: '#3F171B' },
  success: { color: '#D1FAE5', backgroundColor: '#12372A' },
  link: { color: '#C4B5FD', fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.white, fontSize: 23, fontWeight: '800' },
  brandName: { color: colors.text, fontSize: 24, fontWeight: '800' },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 24 },
  eyebrow: { color: '#C4B5FD', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: '800', marginTop: 10 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 7 },
  content: { gap: 18, marginTop: 28 },
  footer: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});

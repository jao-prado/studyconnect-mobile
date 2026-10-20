import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';

const TAB_ICONS = {
  explorar: '⌕',
  'minhas-trilhas': '◇',
  home: '⌂',
};

function TabIcon({ name, focused }) {
  return (
    <View style={[styles.iconBox, focused ? styles.iconBoxFocused : null]}>
      <Text style={[styles.icon, focused ? styles.iconFocused : null]}>{TAB_ICONS[name]}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused }) => <TabIcon focused={focused} name={route.name} />,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      })}
    >
      <Tabs.Screen name="explorar" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="minhas-trilhas" options={{ title: 'Minhas Trilhas' }} />
      <Tabs.Screen name="home" options={{ title: 'Início' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', height: 72, paddingTop: 7, paddingBottom: 8, backgroundColor: '#111113', borderTopColor: colors.border },
  label: { fontSize: 11, fontWeight: '700' },
  iconBox: { width: 31, height: 25, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBoxFocused: { backgroundColor: colors.primarySoft },
  icon: { color: colors.textMuted, fontSize: 21, lineHeight: 23 },
  iconFocused: { color: '#C4B5FD' },
});

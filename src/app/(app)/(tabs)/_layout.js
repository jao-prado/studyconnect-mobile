import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../theme/colors';

const TAB_ICONS = {
  home: ['home-outline', 'home'],
  explorar: ['search-outline', 'search'],
  'minhas-trilhas': ['book-outline', 'book'],
  'study-mode': ['timer-outline', 'timer'],
  perfil: ['person-outline', 'person'],
};

function TabIcon({ name, focused, color }) {
  return <Ionicons name={TAB_ICONS[name][focused ? 1 : 0]} size={23} color={color} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => <TabIcon name={route.name} focused={focused} color={color} />,
        tabBarStyle: [styles.tabBar, { height: 60 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarLabelStyle: styles.label,
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Início' }} />
      <Tabs.Screen name="explorar" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="minhas-trilhas" options={{ title: 'Trilhas' }} />
      <Tabs.Screen name="study-mode" options={{ title: 'Foco', href: Platform.OS === 'android' ? undefined : null }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 5,
    backgroundColor: colors.surfaceSubtle,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
});

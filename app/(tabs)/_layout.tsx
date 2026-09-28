import { Redirect, Tabs } from 'expo-router';
import { Icon } from '../../src/components/Icons';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, fonts } from '../../src/theme';

/** Breathe · Practices · History · Settings. First use comes first, once. */
export default function TabsLayout() {
  const { preferences } = usePreferences();
  if (!preferences.firstUseComplete) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.pine,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.sansSemibold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.divider },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Breathe', tabBarIcon: ({ color }) => <Icon name="breathe" color={color} /> }} />
      <Tabs.Screen name="practices" options={{ title: 'Practices', tabBarIcon: ({ color }) => <Icon name="practices" color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Icon name="history" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }} />
    </Tabs>
  );
}

import { StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Icon } from '../../src/components/Icons';
import { LightProvider, useEverydayWash, useReduceTransparency } from '../../src/light/light';
import { Wash } from '../../src/light/Wash';
import { WASHES } from '../../src/light/washes';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, fonts } from '../../src/theme';

/**
 * Breathe · Practices · History · Settings. First use comes first, once.
 * The tab screens share the hour's Soft Light wash, seen through a
 * translucent tab bar.
 */
export default function TabsLayout() {
  const { preferences } = usePreferences();
  const wash = useEverydayWash();
  const solid = useReduceTransparency();
  if (!preferences.firstUseComplete) return <Redirect href="/welcome" />;

  return (
    <LightProvider wash={wash}>
      <View style={styles.fill}>
        <Wash wash={WASHES[wash]} />
        <Tabs
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            tabBarActiveTintColor: colors.pine,
            tabBarInactiveTintColor: colors.outlineOnWash,
            tabBarLabelStyle: { fontFamily: fonts.sansSemibold, fontSize: 12 },
            tabBarStyle: {
              backgroundColor: solid ? colors.background : colors.tabBar,
              borderTopColor: colors.tabRim,
              borderTopWidth: StyleSheet.hairlineWidth,
              elevation: 0,
            },
            sceneStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Breathe', tabBarIcon: ({ color }) => <Icon name="breathe" color={color} /> }} />
          <Tabs.Screen name="practices" options={{ title: 'Practices', tabBarIcon: ({ color }) => <Icon name="practices" color={color} /> }} />
          <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Icon name="history" color={color} /> }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }} />
        </Tabs>
      </View>
    </LightProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

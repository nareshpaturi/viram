import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icons';
import { LightProvider, useEverydayWash, useReduceTransparency } from '../../src/light/light';
import { Wash } from '../../src/light/Wash';
import { WASHES } from '../../src/light/washes';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { colors, fonts } from '../../src/theme';

/** The tab bar's own height, before the bottom inset, with labels at 100%. */
const BAR_HEIGHT = 49;
const LABEL_SIZE = 12;
const LABEL_LINE = 16;
/** Android tab labels grow to 150%, past which four no longer fit across a phone. */
const LABEL_MAX_SCALE = 1.5;

/**
 * Breathe · Practices · History · Settings. First use comes first, once.
 * The tab screens share the hour's Soft Light wash, seen through a
 * translucent tab bar.
 *
 * Android scales the tab labels with the font size and the bar grows to fit
 * them; a label shrinks to fit its tab rather than being cut off (QA AQ-08).
 * iOS keeps UIKit's fixed size and shows the label large on long press.
 */
export default function TabsLayout() {
  const { preferences } = usePreferences();
  const wash = useEverydayWash();
  const solid = useReduceTransparency();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!preferences.firstUseComplete) return <Redirect href="/welcome" />;
  const scale = Platform.OS === 'android' ? Math.min(Math.max(fontScale, 1), LABEL_MAX_SCALE) : 1;
  const label = { fontSize: LABEL_SIZE * scale, lineHeight: Math.round(LABEL_LINE * scale) };
  // The bar grows with its labels, and a little more, so descenders clear its edge.
  const grow = Math.round((scale - 1) * (LABEL_LINE + 8));

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
            tabBarLabel: ({ color, children }) => (
              <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={[styles.label, label, { color }]}>
                {children}
              </Text>
            ),
            tabBarStyle: {
              height: BAR_HEIGHT + grow + insets.bottom,
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
  label: { fontFamily: fonts.sansSemibold, textAlign: 'center' },
});

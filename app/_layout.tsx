import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { QuickActionsBridge } from '../src/quickstart/QuickActionsBridge';
import { ReminderBridge } from '../src/reminder/ReminderBridge';
import { HealthBridge } from '../src/health/HealthBridge';
import { CompanionBridge } from '../src/companion/CompanionBridge';
import { PreferencesProvider } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, fonts, spacing } from '../src/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type StorageState = 'ready' | 'failed';

function openStorage(): StorageState {
  try {
    stores();
    return 'ready';
  } catch {
    return 'failed';
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });
  const [storage, setStorage] = useState<StorageState>(openStorage);
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsSettled]);

  if (!fontsSettled) return null;
  if (storage === 'failed') return <StorageError onRetry={() => setStorage(openStorage())} />;

  return (
    <PreferencesProvider>
      <StatusBar style="dark" />
      <QuickActionsBridge />
      <ReminderBridge />
      <HealthBridge />
      <CompanionBridge />
      <Stack
        screenOptions={{
          animation: 'fade',
          headerTintColor: colors.pine,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.ink, fontFamily: fonts.sansSemibold },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Breathe' }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="practice" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="complete" options={{ headerShown: false, gestureEnabled: false }} />
        {/* The guide draws its own header plate and back button (Soft Light). */}
        <Stack.Screen name="technique/[id]" options={{ title: '', headerShown: false }} />
        <Stack.Screen name="adjust" options={{ title: 'Adjust rhythm' }} />
        <Stack.Screen name="save-rhythm" options={{ title: 'Save rhythm' }} />
        <Stack.Screen name="rhythms" options={{ title: 'My rhythms' }} />
        <Stack.Screen name="routine/[id]" options={{ title: '' }} />
        <Stack.Screen name="routine/edit" options={{ title: 'Routine' }} />
        <Stack.Screen name="program/[id]" options={{ title: '' }} />
        <Stack.Screen name="program/start" options={{ title: 'Make a plan' }} />
        <Stack.Screen name="share" options={{ title: 'Share' }} />
        <Stack.Screen name="r/[payload]" options={{ title: 'Shared with you' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Practice details' }} />
        <Stack.Screen name="settings/sound" options={{ title: 'Cues & sound' }} />
        <Stack.Screen name="settings/reminder" options={{ title: 'Daily reminder' }} />
        <Stack.Screen name="health" options={{ title: Platform.OS === 'android' ? 'Health Connect' : 'Apple Health' }} />
        <Stack.Screen name="settings/data" options={{ title: 'Your data' }} />
        <Stack.Screen name="settings/safety" options={{ title: 'Safety & wellbeing' }} />
        <Stack.Screen name="settings/privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="settings/about" options={{ title: 'About' }} />
        <Stack.Screen name="settings/sources" options={{ title: 'Sources' }} />
        <Stack.Screen name="settings/timing" options={{ title: 'Cue timing' }} />
      </Stack>
    </PreferencesProvider>
  );
}

/** A failed migration keeps the existing data; the person can retry. */
function StorageError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.error}>
      <AppText variant="title" accessibilityRole="header">
        Viram couldn’t open your practice data.
      </AppText>
      <AppText>Nothing was deleted. Try again, or restart the app. If this keeps happening, update Viram from the store.</AppText>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
});

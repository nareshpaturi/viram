import { Linking } from 'react-native';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { PRIVACY_URL } from '../../src/legal/links';

/** Privacy: what stays on the device and what a share link contains. */
export default function Privacy() {
  return (
    <Screen edges={['left', 'right']}>
      <AppText variant="hero" accessibilityRole="header">
        Your practice,{'\n'}on this device.
      </AppText>
      <AppText>Your settings, saved rhythms, and practice history are stored here. No account is needed, and Viram has no ads or analytics.</AppText>
      <AppText>
        A shared link contains only a practice name, its rhythm, and its length. Anyone with the link can read it. Opening one sends nothing about you.
      </AppText>
      <AppText>Your data is included in your device’s own backups. You can export it or delete local history in Settings.</AppText>
      <Button title="Read the privacy policy" variant="secondary" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => undefined)} />
    </Screen>
  );
}

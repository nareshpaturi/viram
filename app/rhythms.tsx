import { useCallback, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '../src/components/AppText';
import { Button, ButtonRow } from '../src/components/Button';
import { ConfirmPanel } from '../src/components/ConfirmPanel';
import { Screen } from '../src/components/Screen';
import { practiceHref } from '../src/practice/launch';
import { practiceFromRhythm, rhythmSubtitle } from '../src/rhythms/describe';
import { MAX_RHYTHMS, type SavedRhythm } from '../src/rhythms/repository';
import { usePreferences } from '../src/settings/PreferencesProvider';
import { stores } from '../src/storage';
import { colors, radius, spacing, touchTarget } from '../src/theme';

/** My rhythms (FR-10): begin, rename, share, or delete; History keeps its own copies. */
export default function MyRhythms() {
  const { update } = usePreferences();
  const [rhythms, setRhythms] = useState<SavedRhythm[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SavedRhythm | null>(null);
  const reload = useCallback(() => setRhythms(stores().rhythms.list()), []);
  useFocusEffect(reload);

  if (deleting) {
    return (
      <Screen edges={['left', 'right']}>
        <ConfirmPanel
          title={`Delete “${deleting.name}”?`}
          body="It leaves My rhythms on this device. Practices you already did with it stay in History."
          cancelLabel="Keep rhythm"
          confirmLabel="Delete rhythm"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            stores().rhythms.remove(deleting.id);
            setDeleting(null);
            setOpen(null);
            reload();
            AccessibilityInfo.announceForAccessibility('Rhythm deleted');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']}>
      <AppText style={styles.muted}>Your breath. Your rhythm. Saved and received rhythms stay on this device.</AppText>
      {rhythms.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="heading">No saved rhythms yet.</AppText>
          <AppText style={styles.muted}>Save one from Adjust rhythm, or open a practice someone shared with you.</AppText>
          <Button title="Build a custom rhythm" variant="secondary" onPress={() => router.push({ pathname: '/adjust', params: { custom: '1' } })} />
        </View>
      ) : null}
      {rhythms.map((rhythm) => {
        const expanded = open === rhythm.id;
        const practice = practiceFromRhythm(rhythm);
        return (
          <View key={rhythm.id} style={styles.card}>
            <Pressable
              onPress={() => setOpen(expanded ? null : rhythm.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityHint="Shows Begin, Rename, Share, and Delete"
              style={styles.header}
            >
              <View style={styles.text}>
                <AppText variant="bodyStrong">{rhythm.name}</AppText>
                <AppText variant="label">{rhythmSubtitle(rhythm)}</AppText>
                {rhythm.origin === 'link' ? <AppText variant="label">From a shared link</AppText> : null}
              </View>
              <AppText variant="control" style={styles.more} importantForAccessibility="no">
                ⋯
              </AppText>
            </Pressable>
            {expanded ? (
              <View style={styles.actions}>
                <Button
                  title="Begin"
                  onPress={() => {
                    update({ lastPractice: practice });
                    router.push(practiceHref(practice));
                  }}
                />
                <ButtonRow>
                  <Button title="Rename" variant="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/save-rhythm', params: { rename: rhythm.id } })} />
                  <Button title="Share" variant="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/share', params: { practice: JSON.stringify(practice) } })} />
                  <Button title="Adjust" variant="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/adjust', params: { rhythm: rhythm.id } })} />
                </ButtonRow>
                <Button title="Delete" variant="destructive" onPress={() => setDeleting(rhythm)} />
              </View>
            ) : null}
          </View>
        );
      })}
      {rhythms.length > 0 ? (
        <AppText variant="label">
          {rhythms.length} of {MAX_RHYTHMS} saved. Tap a rhythm to begin, rename, share, or delete it.
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.inkSoft },
  empty: { gap: spacing.md },
  card: { borderWidth: 1, borderColor: colors.divider, borderRadius: radius.card, backgroundColor: colors.surface, overflow: 'hidden' },
  header: { minHeight: touchTarget + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.ms, padding: spacing.md },
  text: { flex: 1, gap: 2 },
  more: { color: colors.inkSoft, fontSize: 22 },
  actions: { gap: spacing.sm, padding: spacing.md, paddingTop: 0 },
  flex: { flexGrow: 1, flexBasis: 90 },
});

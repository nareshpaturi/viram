import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ConfirmPanel } from '../../src/components/ConfirmPanel';
import { Screen } from '../../src/components/Screen';
import { applyImport, buildExport, checkImport, exportFileName, type ImportPlan } from '../../src/data/transfer';
import { refreshQuickActions } from '../../src/quickstart/QuickActionsBridge';
import { usePreferences } from '../../src/settings/PreferencesProvider';
import { stores } from '../../src/storage';
import { colors, spacing } from '../../src/theme';

type Mode =
  | { kind: 'idle'; message?: string }
  | { kind: 'review'; plan: ImportPlan; fileName: string }
  | { kind: 'confirmDelete' }
  | { kind: 'deleted' };

const IMPORT_PROBLEM = {
  invalid: 'This file can’t be imported. Something in it is missing or out of bounds, so nothing was changed.',
  newer: 'This file was made by a newer version of Viram. Update Viram, then try again. Nothing was changed.',
  limit: 'This file has more rhythms than fit with yours (20 at most). Delete some in My rhythms, then try again. Nothing was changed.',
} as const;

/**
 * Your data (FR-21, FR-05 deletion): export one file you control, import one
 * with a summary first, and delete local history after confirming.
 */
export default function YourData() {
  const params = useLocalSearchParams<{ delete?: string }>();
  const { preferences } = usePreferences();
  const [mode, setMode] = useState<Mode>(params.delete ? { kind: 'confirmDelete' } : { kind: 'idle' });

  const exportData = async () => {
    try {
      const file = new File(Paths.cache, exportFileName());
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(buildExport(stores()), null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export my data', UTI: 'public.json' });
    } catch {
      setMode({ kind: 'idle', message: 'The export didn’t finish. Nothing left this device. Try again.' });
    }
  };

  const importData = async () => {
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
      if (picked.canceled) return;
      const check = checkImport(await picked.result.text(), stores());
      setMode(check.ok ? { kind: 'review', plan: check.plan, fileName: picked.result.name } : { kind: 'idle', message: IMPORT_PROBLEM[check.reason] });
    } catch {
      setMode({ kind: 'idle', message: IMPORT_PROBLEM.invalid });
    }
  };

  if (mode.kind === 'confirmDelete') {
    return (
      <Screen edges={['left', 'right']}>
        <ConfirmPanel
          title="Delete local history?"
          body="This removes every practice saved on this device. Your cue settings and saved rhythms stay the same."
          cancelLabel="Keep history"
          confirmLabel="Delete local history"
          destructive
          onCancel={() => (params.delete ? router.back() : setMode({ kind: 'idle' }))}
          onConfirm={() => {
            try {
              stores().history.deleteAll();
              refreshQuickActions(preferences);
              setMode({ kind: 'deleted' });
              AccessibilityInfo.announceForAccessibility('Local history deleted');
            } catch {
              setMode({ kind: 'idle', message: 'History couldn’t be deleted. Nothing was removed. Try again.' });
            }
          }}
        />
      </Screen>
    );
  }

  if (mode.kind === 'deleted') {
    return (
      <Screen edges={['left', 'right']} footer={<Button title="View History" onPress={() => router.navigate('/history')} />}>
        <AppText variant="hero" accessibilityRole="header">
          Local history deleted.
        </AppText>
        <AppText>Your cue settings and saved rhythms are unchanged.</AppText>
      </Screen>
    );
  }

  if (mode.kind === 'review') {
    const { plan } = mode;
    const rhythms = plan.rhythms.newItems.length;
    const sessions = plan.sessions.newItems.length;
    const nothing = rhythms === 0 && sessions === 0 && !plan.preferences;
    return (
      <Screen
        edges={['left', 'right']}
        footer={
          <>
            <Button
              title={nothing ? 'Nothing new to import' : `Import ${rhythms} ${rhythms === 1 ? 'rhythm' : 'rhythms'} and ${sessions} ${sessions === 1 ? 'practice' : 'practices'}`}
              disabled={nothing}
              onPress={() => {
                try {
                  applyImport(plan, stores());
                  refreshQuickActions(preferences);
                  setMode({ kind: 'idle', message: 'Imported. Everything new from the file is now on this device.' });
                } catch {
                  setMode({ kind: 'idle', message: 'The import didn’t finish, so nothing was changed. Try again.' });
                }
              }}
            />
            <Button title="Cancel" variant="secondary" onPress={() => setMode({ kind: 'idle' })} />
          </>
        }
      >
        <AppText variant="title" accessibilityRole="header">
          Import this file?
        </AppText>
        <AppText variant="label">{mode.fileName}</AppText>
        <Card>
          <Line title="My rhythms" detail={`${plan.rhythms.found} found · ${plan.rhythms.found - rhythms} already saved`} />
          <Line title="Practice history" detail={`${plan.sessions.found} found · ${plan.sessions.found - sessions} already here`} />
          <Line title="Settings" detail={plan.preferences ? 'Restored from the file' : 'Kept as they are now'} />
        </Card>
        <AppText variant="label">Every rhythm is checked like a shared link. Anything out of bounds stops the import, and nothing is changed.</AppText>
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']}>
      <AppText variant="title" accessibilityRole="header">
        Your practice,{'\n'}in a file.
      </AppText>
      <AppText>Export saves My rhythms, history, and settings in one file you control. Nothing is uploaded.</AppText>
      <Card muted>
        <AppText variant="bodyStrong">Included in device backups</AppText>
        <AppText>Viram is part of your iCloud or Google backup, so a new phone restored from backup keeps your practice.</AppText>
      </Card>
      <Button title="Export my data" onPress={exportData} />
      <Button title="Import from a file" variant="secondary" onPress={importData} />
      <AppText variant="label">Importing adds what’s new and skips what you already have.</AppText>
      {mode.message ? (
        <AppText accessibilityRole="alert" style={styles.message}>
          {mode.message}
        </AppText>
      ) : null}
      <View style={styles.spacer} />
      <Button title="Delete local history" variant="destructive" onPress={() => setMode({ kind: 'confirmDelete' })} />
    </Screen>
  );
}

function Line({ title, detail }: { title: string; detail: string }) {
  return (
    <View>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="label">{detail}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  message: { color: colors.pine },
  spacer: { height: spacing.lg },
});

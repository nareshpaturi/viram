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
import { refreshWidget } from '../../src/widget/WidgetBridge';
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
  limit: 'This file has more rhythms or routines than fit with yours (20 of each at most). Delete some, then try again. Nothing was changed.',
} as const;

/**
 * Your data (FR-21, FR-05 deletion): export one file you control, import one
 * with a summary first, and delete local history after confirming.
 */
export default function YourData() {
  const params = useLocalSearchParams<{ delete?: string }>();
  const { preferences, reload } = usePreferences();
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
          body="This removes every practice saved on this device. Your cue settings, saved rhythms, and routines stay the same, and sessions already added to Apple Health or Health Connect stay there."
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
    const routines = plan.routines.newItems.length;
    const sessions = plan.sessions.newItems.length;
    const nothing = rhythms === 0 && routines === 0 && sessions === 0 && !plan.preferences && plan.programs.length === 0;
    return (
      <Screen
        edges={['left', 'right']}
        footer={
          <>
            <Button
              title={nothing ? 'Nothing new to import' : `Import ${importLabel(rhythms, routines, sessions)}`}
              disabled={nothing}
              onPress={() => {
                try {
                  applyImport(plan, stores());
                  // Restored settings apply now, not after a restart (QA F02, AQ-04); reminders and the watch follow the context.
                  const restored = reload();
                  refreshQuickActions(restored);
                  refreshWidget(restored);
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
          <Line title="Routines" detail={`${plan.routines.found} found · ${plan.routines.found - routines} already saved`} />
          {plan.programs.length ? <Line title="Programs" detail={`Progress in ${plan.programs.length} ${plan.programs.length === 1 ? 'program' : 'programs'}`} /> : null}
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
      <AppText>Export saves My rhythms, routines, history, and settings in one file you control. Nothing is uploaded.</AppText>
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

/** “2 rhythms, 1 routine, and 14 practices”; routines only when there are some. */
function importLabel(rhythms: number, routines: number, sessions: number): string {
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const items = [count(rhythms, 'rhythm', 'rhythms'), ...(routines ? [count(routines, 'routine', 'routines')] : []), count(sessions, 'practice', 'practices')];
  return items.length === 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
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

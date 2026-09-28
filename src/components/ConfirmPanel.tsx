import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

/** In-page confirmation: says what happens, keeps the safe choice first. */
export function ConfirmPanel({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, destructive }: Props) {
  return (
    <View style={styles.panel} accessibilityRole="alert">
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <AppText>{body}</AppText>
      <Button title={cancelLabel} variant="primary" onPress={onCancel} />
      <Button title={confirmLabel} variant={destructive ? 'destructive' : 'secondary'} onPress={onConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.ms,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
});

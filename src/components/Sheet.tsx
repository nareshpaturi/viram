import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  /** A line under the title, e.g. the practice a choice applies to. */
  subtitle?: string;
  onClose: () => void;
  /**
   * 'done' (default) ends with one Done button. 'close' puts a close button
   * by the title and no footer: each choice in the sheet applies at once.
   */
  dismiss?: 'done' | 'close';
  children: ReactNode;
}

/** Bottom sheet over the screen it changes: 24 px top radius, pine-dark scrim. */
export function Sheet({ visible, title, subtitle, onClose, dismiss = 'done', children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
          <View style={styles.handle} importantForAccessibility="no" accessibilityElementsHidden />
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.titles}>
                <AppText variant="heading" accessibilityRole="header" style={dismiss === 'close' ? styles.bigTitle : undefined}>
                  {title}
                </AppText>
                {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
              </View>
              {dismiss === 'close' ? (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={4}
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.pine} strokeWidth={2.2} strokeLinecap="round">
                    <Path d="M6 6l12 12M18 6L6 18" />
                  </Svg>
                </Pressable>
              ) : null}
            </View>
            {children}
          </ScrollView>
          {dismiss === 'done' ? (
            <View style={styles.footer}>
              <Button title="Done" onPress={onClose} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: 10, backgroundColor: '#D5DED6' },
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.ms },
  titles: { flex: 1, gap: 2 },
  bigTitle: { fontSize: 26, lineHeight: 32 },
  subtitle: { fontSize: 15, lineHeight: 20, color: colors.inkSoft },
  close: { width: touchTarget, height: touchTarget, borderRadius: touchTarget / 2, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  footer: { paddingHorizontal: spacing.lg },
});

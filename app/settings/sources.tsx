import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText } from '../../src/components/AppText';
import { ListRow, RowGroup } from '../../src/components/ListRow';
import { Screen } from '../../src/components/Screen';
import { sourceLink } from '../../src/content/sourceText';
import { SOURCES, type SourceId } from '../../src/content/sources';

/** Settings › About › Sources, in two groups: books and texts, and studies. */
export default function Sources() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  const studies = group === 'studies';
  const ids = (Object.keys(SOURCES) as SourceId[]).filter((id) => (SOURCES[id].kind === 'study') === studies);

  return (
    <Screen edges={['left', 'right']}>
      <AppText variant="title" accessibilityRole="header">
        {studies ? 'Published studies' : 'Books and classical texts'}
      </AppText>
      <RowGroup>
        {ids.map((id) => {
          const source = SOURCES[id];
          const link = sourceLink(id);
          return (
            <ListRow
              key={id}
              title={source.title}
              subtitle={`${source.authors} · ${source.year}`}
              detail={'venue' in source ? source.venue : null}
              onPress={link ? () => Linking.openURL(link).catch(() => undefined) : undefined}
              accessibilityHint={link ? 'Opens in your browser' : undefined}
            />
          );
        })}
      </RowGroup>
    </Screen>
  );
}

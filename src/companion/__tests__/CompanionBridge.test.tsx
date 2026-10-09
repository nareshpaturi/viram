/** The bridge keeps the watch in step: regressions from the Apple Watch QA report of 2026-10-08. */
import { AppState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import NativeCompanion from '../../../modules/viram-companion';
import { customPractice } from '../../practice/practice';
import { stores } from '../../storage';
import { migrate } from '../../storage/db';
import { createStores } from '../../storage/stores';
import { memoryDb } from '../../storage/__tests__/testDb';
import { CompanionBridge, refreshWatch } from '../CompanionBridge';

jest.mock('../../../modules/viram-companion', () => ({
  __esModule: true,
  default: {
    sendContext: jest.fn(async () => true),
    pendingSessions: jest.fn(() => []),
    acknowledge: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('../../../modules/viram-health', () => ({ __esModule: true, default: null }));
jest.mock('../../settings/PreferencesProvider', () => ({
  usePreferences: () => ({ preferences: jest.requireActual('../../settings/preferences').DEFAULT_PREFERENCES }),
}));
jest.mock('../../storage', () => ({ stores: jest.fn() }));
jest.mock('../../quickstart/QuickActionsBridge', () => ({ refreshQuickActions: jest.fn() }));

const send = NativeCompanion!.sendContext as jest.Mock;
async function mount(): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(<CompanionBridge />);
  });
  return tree!;
}
const sentNames = () => (JSON.parse(send.mock.calls.at(-1)[0]) as { practices: { name: string }[] }).practices.map((p) => p.name);

describe('companion bridge', () => {
  let foreground: (state: string) => void;
  beforeEach(() => {
    const db = memoryDb();
    migrate(db);
    (stores as jest.Mock).mockReturnValue(createStores(db));
    send.mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      foreground = listener as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
  });

  it('sends a rhythm saved while Viram stays open, without waiting for the foreground (QA W07)', async () => {
    const tree = await mount();
    expect(send).toHaveBeenCalledTimes(1);
    stores().rhythms.save({ name: 'Wind down', techniqueId: null, steps: customPractice().steps, target: { rounds: 1 }, origin: 'custom' });
    await act(async () => refreshWatch());
    expect(send).toHaveBeenCalledTimes(2);
    expect(sentNames()).toContain('Wind down');
    // Nothing changed: nothing more to send.
    await act(async () => refreshWatch());
    expect(send).toHaveBeenCalledTimes(2);
    await act(async () => {
      tree.unmount();
    });
  });

  it('sends again when the native side couldn’t send yet', async () => {
    send.mockResolvedValueOnce(false);
    const tree = await mount();
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => foreground('active'));
    expect(send).toHaveBeenCalledTimes(2);
    // Sent this time, so the next foreground has nothing new.
    await act(async () => foreground('active'));
    expect(send).toHaveBeenCalledTimes(2);
    await act(async () => {
      tree.unmount();
    });
  });
});

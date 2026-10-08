/**
 * The home-screen widget's data (src/widget/widget.ts): written where the
 * widget can read it (an App Group on iOS, the app's preferences on
 * Android), then the widget is redrawn. Null where the module isn't built
 * in (web, tests).
 */
import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class ViramWidgetModule extends NativeModule {
  setWidget(json: string): void;
}

export default requireOptionalNativeModule<ViramWidgetModule>('ViramWidget');

package app.viram.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Saves the widget's JSON and redraws any Breathe widgets on the home screen. */
class ViramWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ViramWidget")

    Function("setWidget") { json: String ->
      val context = appContext.reactContext ?: return@Function
      BreatheWidget.save(context, json)
    }
  }
}

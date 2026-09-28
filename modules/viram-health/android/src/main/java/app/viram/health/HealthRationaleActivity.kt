package app.viram.health

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/** Opens Viram's privacy page, which explains session writing, then closes. */
class HealthRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://viram.app/privacy/"))) }
    finish()
  }
}

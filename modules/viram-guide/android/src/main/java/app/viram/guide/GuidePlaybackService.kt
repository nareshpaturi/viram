package app.viram.guide

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder

/**
 * The mediaPlayback foreground service behind locked-screen guidance (FR-04).
 * Its media-style notification shows the practice, round, and time left, with
 * Pause or Resume and End. Media-session notifications don't need the
 * notification permission, so nothing is requested.
 */
class GuidePlaybackService : Service() {
  private lateinit var session: MediaSession

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    session = MediaSession(this, "Viram").apply {
      setCallback(
        object : MediaSession.Callback() {
          override fun onPlay() = GuideEngine.remote("play")
          override fun onPause() = GuideEngine.remote("pause")
          override fun onStop() = GuideEngine.remote("end")
        }
      )
      isActive = true
    }
    instance = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_PAUSE -> GuideEngine.remote("pause")
      ACTION_PLAY -> GuideEngine.remote("play")
      ACTION_END -> GuideEngine.remote("end")
    }
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    else startForeground(NOTIFICATION_ID, notification)
    // The practice may have ended before the service came up.
    if (!GuideEngine.isActive) stopNow()
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    instance = null
    session.release()
    super.onDestroy()
  }

  /** A swipe from recents ends the practice; a force-quit never creates a record. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    GuideEngine.stop()
    super.onTaskRemoved(rootIntent)
  }

  private fun stopNow() {
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun update() {
    getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val paused = GuideEngine.isPaused
    session.setMetadata(
      MediaMetadata.Builder()
        .putString(MediaMetadata.METADATA_KEY_TITLE, GuideEngine.title)
        .putString(MediaMetadata.METADATA_KEY_ARTIST, GuideEngine.subtitle)
        .build()
    )
    session.setPlaybackState(
      PlaybackState.Builder()
        .setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_STOP)
        .setState(if (paused) PlaybackState.STATE_PAUSED else PlaybackState.STATE_PLAYING, PlaybackState.PLAYBACK_POSITION_UNKNOWN, if (paused) 0f else 1f)
        .build()
    )
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Practice", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shows your practice while the screen is locked."
          setShowBadge(false)
        }
      )
    }
    val toggle =
      if (paused) action(android.R.drawable.ic_media_play, "Resume", ACTION_PLAY)
      else action(android.R.drawable.ic_media_pause, "Pause", ACTION_PAUSE)
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(GuideEngine.title)
      .setContentText(GuideEngine.subtitle)
      .setContentIntent(open)
      .setOngoing(!paused)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setCategory(Notification.CATEGORY_TRANSPORT)
      .addAction(toggle)
      .addAction(action(android.R.drawable.ic_menu_close_clear_cancel, "End", ACTION_END))
      .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1))
      .build()
  }

  private fun action(icon: Int, title: String, action: String): Notification.Action {
    val intent = Intent(this, GuidePlaybackService::class.java).setAction(action)
    val pending = PendingIntent.getService(this, action.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    return Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this, icon), title, pending).build()
  }

  companion object {
    private const val CHANNEL_ID = "viram-practice"
    private const val NOTIFICATION_ID = 7310
    private const val ACTION_PAUSE = "app.viram.guide.PAUSE"
    private const val ACTION_PLAY = "app.viram.guide.PLAY"
    private const val ACTION_END = "app.viram.guide.END"

    @Volatile private var instance: GuidePlaybackService? = null

    fun show(context: Context) {
      if (instance != null) return refresh()
      context.startForegroundService(Intent(context, GuidePlaybackService::class.java))
    }

    fun refresh() {
      instance?.let { it.mainExecutor.execute { it.update() } }
    }

    fun hide(context: Context) {
      // Re-checked on the main thread: a new practice may have started since.
      instance?.let { it.mainExecutor.execute { if (!GuideEngine.isActive) it.stopNow() } }
    }
  }
}

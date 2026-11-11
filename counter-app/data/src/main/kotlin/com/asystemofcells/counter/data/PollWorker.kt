package com.asystemofcells.counter.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.asystemofcells.counter.core.Inbox
import java.util.concurrent.TimeUnit

/** Every N minutes (15 at the fastest) when ntfy is not delivering: look at the inbox, and announce orders not seen before. */
class PollWorker(private val ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val settings = SettingsStore(ctx); val tokens = TokenStore(ctx)
        if (tokens.get("owner").isNullOrBlank()) return Result.success()
        val api = OwnerApi({ settings.load().apiBase }, { tokens.get("owner") })
        val orders = try { api.orders() } catch (e: Exception) { return Result.retry() }
        val seen = settings.seen()
        val fresh = orders.filter { it.nextAction == "decide" && it.id !in seen }
        if (fresh.isNotEmpty()) announce(fresh.size, fresh.first().id, Inbox.badge(orders))
        settings.markSeen(orders.map { it.id }.toSet())
        return Result.success()
    }

    private fun announce(count: Int, firstId: String, badge: Int) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Orders", NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(ctx, 0, Intent(Intent.ACTION_VIEW, Uri.parse("asoc-counter://orders/$firstId")).setPackage(ctx.packageName), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        nm.notify(1, NotificationCompat.Builder(ctx, CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(if (count == 1) "A new order" else "$count new orders").setContentText("$badge waiting on you").setContentIntent(open).setAutoCancel(true).build())
    }

    companion object {
        private const val CHANNEL = "orders"
        fun schedule(ctx: Context, minutes: Int) {
            val req = PeriodicWorkRequestBuilder<PollWorker>(minutes.coerceAtLeast(15).toLong(), TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("poll", ExistingPeriodicWorkPolicy.UPDATE, req)
        }
    }
}

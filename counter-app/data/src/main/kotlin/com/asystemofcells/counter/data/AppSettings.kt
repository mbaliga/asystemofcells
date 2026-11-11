package com.asystemofcells.counter.data

import android.content.Context

/** Plain settings (no secrets). Print capacity and vacation mode are the owner's switches; the site reads them from the ledger once the server supports it. */
data class Settings(
    val apiBase: String = "https://asystemofcells.com", val ntfyUrl: String = "https://ntfy.sh", val ntfyTopic: String = "",
    val pollMinutes: Int = 15, val printCapacity: Int = 5, val vacationUntil: String = "",
)

class SettingsStore(context: Context) {
    private val p = context.getSharedPreferences("counter_settings", Context.MODE_PRIVATE)
    fun load() = Settings(
        p.getString("apiBase", "https://asystemofcells.com")!!, p.getString("ntfyUrl", "https://ntfy.sh")!!, p.getString("ntfyTopic", "")!!,
        p.getInt("pollMinutes", 15), p.getInt("printCapacity", 5), p.getString("vacationUntil", "")!!,
    )
    fun save(s: Settings) = p.edit().putString("apiBase", s.apiBase.trimEnd('/')).putString("ntfyUrl", s.ntfyUrl.trimEnd('/')).putString("ntfyTopic", s.ntfyTopic)
        .putInt("pollMinutes", s.pollMinutes.coerceIn(15, 24 * 60)).putInt("printCapacity", s.printCapacity).putString("vacationUntil", s.vacationUntil).apply()

    /** Order ids already announced, so a poll only notifies about new ones. */
    fun seen(): Set<String> = p.getStringSet("seen", emptySet()) ?: emptySet()
    fun markSeen(ids: Set<String>) = p.edit().putStringSet("seen", ids).apply()
}

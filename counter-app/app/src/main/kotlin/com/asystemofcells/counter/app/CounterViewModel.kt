package com.asystemofcells.counter.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.asystemofcells.counter.core.*
import com.asystemofcells.counter.data.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UiState(
    val orders: List<OrderSummary> = emptyList(), val loading: Boolean = false, val message: String? = null,
    val open: OrderDetail? = null, val settings: Settings = Settings(), val hasToken: Boolean = false,
)

class CounterViewModel(app: Application) : AndroidViewModel(app) {
    private val settingsStore = SettingsStore(app)
    private val tokens = TokenStore(app)
    private val api = OwnerApi({ settingsStore.load().apiBase }, { tokens.get("owner") })
    private val _state = MutableStateFlow(UiState(settings = settingsStore.load(), hasToken = !tokens.get("owner").isNullOrBlank()))
    val state: StateFlow<UiState> = _state.asStateFlow()

    private fun run(block: suspend () -> Unit) = viewModelScope.launch {
        _state.update { it.copy(loading = true, message = null) }
        try { block() } catch (e: Exception) { _state.update { it.copy(message = e.message ?: "That did not work.") } }
        _state.update { it.copy(loading = false) }
    }

    fun refresh() = run { val o = api.orders(); _state.update { it.copy(orders = o) } }
    fun open(id: String) = run { val d = api.order(id); _state.update { it.copy(open = d) } }
    fun close() = _state.update { it.copy(open = null) }
    fun dismissMessage() = _state.update { it.copy(message = null) }

    /** Every action is one call; afterwards the order and the inbox are re-read so the timeline shows the appended event. */
    private fun act(id: String, call: suspend () -> Unit) = run { call(); val d = api.order(id); val o = api.orders(); _state.update { it.copy(open = d, orders = o) } }
    fun accept(id: String, total: Int?, note: String?) = act(id) { api.accept(id, total, note) }
    fun reject(id: String, reason: String) = act(id) { api.reject(id, reason) }
    fun advance(id: String, status: String, carrier: String? = null, tracking: String? = null) = act(id) { api.advance(id, status, carrier, tracking) }
    fun rebuild() = run { api.rebuild(); _state.update { it.copy(message = "The site is rebuilding.") } }
    fun markSold(item: String) = run { api.markSoldOffline(item); _state.update { it.copy(message = "Marked sold.") } }

    fun saveSettings(s: Settings, ownerToken: String?, ntfyToken: String?) {
        settingsStore.save(s)
        if (!ownerToken.isNullOrBlank()) tokens.put("owner", ownerToken)
        if (!ntfyToken.isNullOrBlank()) tokens.put("ntfy", ntfyToken)
        PollWorker.schedule(getApplication(), s.pollMinutes)
        _state.update { it.copy(settings = settingsStore.load(), hasToken = !tokens.get("owner").isNullOrBlank(), message = "Saved.") }
    }
}

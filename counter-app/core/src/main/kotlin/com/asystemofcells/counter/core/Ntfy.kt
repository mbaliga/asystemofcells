package com.asystemofcells.counter.core

import kotlinx.serialization.Serializable

/** One line of ntfy's JSON stream, e.g. {"id":"x","time":1,"event":"message","topic":"t","title":"Paid","message":"01ABC · ₹4910","priority":4,"click":"asoc-counter://orders/01ABC"}. */
@Serializable data class NtfyMessage(
    val id: String = "", val time: Long = 0, val event: String = "message", val topic: String = "",
    val title: String? = null, val message: String? = null, val priority: Int = 3, val click: String? = null, val tags: List<String> = emptyList(),
)

enum class PushKind { NEW_ORDER, PAID, CANCELLED, CLOSED_ORDER_PAID, OTHER }
data class Push(val kind: PushKind, val orderId: String?, val text: String, val high: Boolean)

object Ntfy {
    private val ULID = Regex("[0-9A-HJKMNP-TV-Z]{26}")
    private const val LINK = "asoc-counter://orders/"

    fun parseLine(line: String): NtfyMessage? =
        runCatching { CounterJson.decodeFromString(NtfyMessage.serializer(), line.trim()) }.getOrNull()?.takeIf { it.event == "message" }

    /** The order id: from the deep link if there is one, else the first ULID in the message. */
    fun orderId(m: NtfyMessage): String? =
        m.click?.takeIf { it.startsWith(LINK) }?.removePrefix(LINK)?.takeIf { ULID.matches(it) } ?: ULID.find(m.message.orEmpty())?.value

    fun classify(m: NtfyMessage): Push {
        val title = m.title.orEmpty()
        val kind = when {
            title.startsWith("New ") && title.endsWith("order") -> PushKind.NEW_ORDER
            title == "Paid" -> PushKind.PAID
            title == "Order cancelled" -> PushKind.CANCELLED
            title == "Payment on a closed order" || title == "Payment on an unknown link" || title == "One piece, two payments" -> PushKind.CLOSED_ORDER_PAID
            else -> PushKind.OTHER
        }
        return Push(kind, orderId(m), m.message.orEmpty(), m.priority >= 4)
    }
}

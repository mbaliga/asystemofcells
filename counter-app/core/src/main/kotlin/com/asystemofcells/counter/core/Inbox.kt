package com.asystemofcells.counter.core

/** The inbox sections, in the order the owner works through them. */
enum class InboxSection(val action: String, val label: String) {
    DECIDE("decide", "Decide"), WAIT_FILE("wait-for-model", "Waiting for the file"), WAIT_PAY("waiting-for-payment", "Waiting for payment"),
    MAKE("make", "Make"), PACK("pack", "Pack"), SENT("sent", "Sent");
}

data class InboxGroup(val section: InboxSection, val orders: List<OrderSummary>)

object Inbox {
    /** Group open orders by what is next; oldest first inside a group (the one that has waited longest is on top). Empty groups are dropped. */
    fun group(orders: List<OrderSummary>): List<InboxGroup> =
        InboxSection.entries.mapNotNull { sec ->
            val rows = orders.filter { it.nextAction == sec.action }.sortedBy { it.createdAt }
            if (rows.isEmpty()) null else InboxGroup(sec, rows)
        }

    /** Badge count: orders waiting on the owner's decision or hands. */
    fun badge(orders: List<OrderSummary>) = orders.count { it.nextAction == "decide" || it.nextAction == "make" || it.nextAction == "pack" }
}

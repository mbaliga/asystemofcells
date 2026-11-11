package com.asystemofcells.counter.core

import kotlin.test.*

private fun s(id: String, kind: String, status: Status, at: String) =
    OrderSummary(id, kind, status.wire, at, Machine.nextAction(kind, status), SummaryCustomer("Asha", "Hyderabad", "IN"), 1000)

class InboxNtfyTest {
    @Test fun `inbox groups by what is next, oldest first, and drops empty groups`() {
        val g = Inbox.group(listOf(
            s("b", "cabinet", Status.PLACED, "2026-11-02"), s("a", "print", Status.REVIEWING, "2026-11-01"), s("c", "print", Status.PAID, "2026-11-03"),
            s("d", "cabinet", Status.ACCEPTED, "2026-11-03"), s("e", "cabinet", Status.DISPATCHED, "2026-11-04"), s("f", "cabinet", Status.PAID, "2026-11-05"),
        ))
        assertEquals(listOf(InboxSection.DECIDE, InboxSection.WAIT_PAY, InboxSection.MAKE, InboxSection.PACK, InboxSection.SENT), g.map { it.section })
        assertEquals(listOf("a", "b"), g[0].orders.map { it.id })
        assertEquals(4, Inbox.badge(g.flatMap { it.orders }))
    }

    @Test fun `owner actions follow the state machine`() {
        assertEquals(listOf(OwnerAction.Accept, OwnerAction.Reject), OwnerAction.available("print", Status.REVIEWING))
        assertEquals(listOf(OwnerAction.StartMaking), OwnerAction.available("print", Status.PAID))
        assertEquals(listOf(OwnerAction.Dispatch), OwnerAction.available("cabinet", Status.PAID))
        assertEquals(listOf(OwnerAction.Dispatch), OwnerAction.available("print", Status.FINISHING))
        assertEquals(listOf(OwnerAction.Reject), OwnerAction.available("print", Status.ACCEPTED))
        assertEquals(listOf(OwnerAction.Delivered), OwnerAction.available("print", Status.DISPATCHED))
        assertEquals(emptyList(), OwnerAction.available("print", Status.REJECTED))
    }

    private val id = "01M6NEZEM0484K9J3H01KDEPTV"
    @Test fun `ntfy lines parse and classify`() {
        val paid = Ntfy.parseLine("""{"id":"x","time":1,"event":"message","topic":"t","title":"Paid","message":"$id · ₹4910","priority":4,"click":"asoc-counter://orders/$id","tags":["moneybag"]}""")!!
        val p = Ntfy.classify(paid)
        assertEquals(PushKind.PAID, p.kind); assertEquals(id, p.orderId); assertTrue(p.high)
        val neu = Ntfy.classify(Ntfy.parseLine("""{"event":"message","title":"New print order","message":"$id · ₹299 · client-estimate","priority":3}""")!!)
        assertEquals(PushKind.NEW_ORDER, neu.kind); assertEquals(id, neu.orderId); assertFalse(neu.high)
        assertEquals(PushKind.CANCELLED, Ntfy.classify(Ntfy.parseLine("""{"event":"message","title":"Order cancelled","message":"$id","priority":2}""")!!).kind)
        assertEquals(PushKind.CLOSED_ORDER_PAID, Ntfy.classify(Ntfy.parseLine("""{"event":"message","title":"Payment on a closed order","message":"$id (expired). Refund","priority":4}""")!!).kind)
    }

    @Test fun `ntfy keepalives, open events and junk are ignored`() {
        assertNull(Ntfy.parseLine("""{"event":"keepalive","topic":"t"}"""))
        assertNull(Ntfy.parseLine("""{"event":"open","topic":"t"}"""))
        assertNull(Ntfy.parseLine("not json"))
        assertNull(Ntfy.classify(Ntfy.parseLine("""{"event":"message","title":"Hello","message":"x"}""")!!).orderId)
        assertNull(Ntfy.orderId(NtfyMessage(click = "asoc-counter://orders/short")))
    }
}

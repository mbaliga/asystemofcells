package com.asystemofcells.counter.core

/** The order state machine, mirrored from api/counter/_machine.js. MachineParityTest checks every transition against the server's. */
enum class Status(val wire: String) {
    PLACED("placed"), REVIEWING("reviewing"), ACCEPTED("accepted"), PAID("paid"), IN_PRODUCTION("in_production"),
    FINISHING("finishing"), DISPATCHED("dispatched"), DELIVERED("delivered"), REJECTED("rejected"),
    CANCELLED("cancelled"), EXPIRED("expired"), REFUNDED("refunded");

    companion object { fun of(wire: String): Status? = entries.firstOrNull { it.wire == wire } }
}

object Machine {
    fun allowed(kind: String, from: Status): List<Status> = buildList {
        when (from) {
            Status.PLACED -> { add(Status.REVIEWING); add(Status.REJECTED); add(Status.CANCELLED); add(Status.EXPIRED); if (kind == "cabinet") add(Status.ACCEPTED) }
            Status.REVIEWING -> { add(Status.ACCEPTED); add(Status.REJECTED); add(Status.CANCELLED) }
            Status.ACCEPTED -> { add(Status.PAID); add(Status.EXPIRED); add(Status.CANCELLED); add(Status.REJECTED) }
            Status.PAID -> { add(if (kind == "print") Status.IN_PRODUCTION else Status.DISPATCHED); add(Status.REFUNDED) }
            Status.IN_PRODUCTION -> { add(Status.FINISHING); add(Status.REFUNDED) }
            Status.FINISHING -> { add(Status.DISPATCHED); add(Status.REFUNDED) }
            Status.DISPATCHED -> { add(Status.DELIVERED); add(Status.REFUNDED) }
            Status.DELIVERED -> add(Status.REFUNDED)
            else -> {}
        }
    }

    fun canTransition(kind: String, from: Status, to: Status) = to in allowed(kind, from)
    fun isOpen(s: Status) = s !in setOf(Status.DELIVERED, Status.REJECTED, Status.CANCELLED, Status.EXPIRED, Status.REFUNDED)

    /** What the owner must do next (the inbox groups by this). */
    fun nextAction(kind: String, s: Status): String? = when (s) {
        Status.PLACED -> if (kind == "print") "wait-for-model" else "decide"
        Status.REVIEWING -> "decide"
        Status.ACCEPTED -> "waiting-for-payment"
        Status.PAID -> if (kind == "print") "make" else "pack"
        Status.IN_PRODUCTION, Status.FINISHING -> "make"
        Status.DISPATCHED -> "sent"
        else -> null
    }
}

/** The actions the order screen offers, in the order of the bottom arc. Every action is one call and one appended event. */
sealed interface OwnerAction {
    data object Accept : OwnerAction
    data object Reject : OwnerAction
    data object StartMaking : OwnerAction
    data object Finishing : OwnerAction
    data object Dispatch : OwnerAction
    data object Delivered : OwnerAction

    companion object {
        fun available(kind: String, status: Status): List<OwnerAction> = buildList {
            if (Machine.canTransition(kind, status, Status.ACCEPTED) && status != Status.ACCEPTED) add(Accept)
            if (Machine.canTransition(kind, status, Status.REJECTED)) add(Reject)
            if (Machine.canTransition(kind, status, Status.IN_PRODUCTION)) add(StartMaking)
            if (Machine.canTransition(kind, status, Status.FINISHING)) add(Finishing)
            if (Machine.canTransition(kind, status, Status.DISPATCHED)) add(Dispatch)
            if (Machine.canTransition(kind, status, Status.DELIVERED)) add(Delivered)
        }
    }
}

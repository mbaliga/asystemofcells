package com.asystemofcells.counter.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable data class Customer(val name: String, val email: String = "", val phone: String? = null)
@Serializable data class ShipTo(val line1: String = "", val line2: String = "", val city: String = "", val state: String = "", val postcode: String = "", val country: String = "IN") {
    fun oneLine() = listOfNotNull(line1, line2.ifBlank { null }, city, state, postcode, country).joinToString(", ")
}
@Serializable data class Quote(
    val subtotal: Double = 0.0, val finish: Double = 0.0, val packaging: Double = 0.0, val shipping: Double = 0.0,
    val total: Int = 0, val bandInr: Int = 0, val currency: String = "INR", val zone: String = "IN", val grams: Int = 0,
)
@Serializable data class Accepted(val at: String, val total: Int, val note: String? = null)
@Serializable data class Payment(val provider: String = "razorpay", val linkId: String? = null, val shortUrl: String? = null, val status: String = "", val paidAt: String? = null, val paymentId: String? = null)
@Serializable data class Fulfilment(val startedAt: String? = null, val finishedAt: String? = null, val dispatchedAt: String? = null, val carrier: String? = null, val tracking: String? = null, val deliveredAt: String? = null)

@Serializable data class Order(
    val id: String, val kind: String, val createdAt: String, val status: String,
    val customer: Customer, val shipTo: ShipTo, val zone: String = "IN",
    /** Cabinet: {item,title,qty,unitInr,kind}. Print: {model,settings,estimate,tier,qty,colour,filament}. Kept raw; see PrintItem / CabinetItem. */
    val items: List<JsonElement> = emptyList(),
    val quote: Quote, val accepted: Accepted? = null, val payment: Payment? = null, val fulfilment: Fulfilment = Fulfilment(),
    val customerNote: String? = null, val flags: List<String> = emptyList(), val emailVerified: Boolean = false,
)

@Serializable data class Event(val at: String, val type: String, val status: String? = null, val note: String? = null, val paymentId: String? = null)
@Serializable data class OrderDetail(val order: Order, val events: List<Event> = emptyList(), val modelUrl: String? = null, val nextAction: String? = null)

@Serializable data class SummaryCustomer(val firstName: String, val city: String = "", val country: String = "")
@Serializable data class OrderSummary(
    val id: String, val kind: String, val status: String, val createdAt: String, val nextAction: String? = null,
    val customer: SummaryCustomer, val total: Int, val flags: List<String> = emptyList(), val summary: String = "",
)
@Serializable data class OrderList(val orders: List<OrderSummary> = emptyList())
@Serializable data class AcceptResult(val shortUrl: String)

@Serializable data class PrintModel(val name: String, val sha256: String = "", val bytes: Long = 0, val ext: String = "", val storageKey: String = "")
@Serializable data class PrintEstimate(val massG: Double = 0.0, val printMin: Double = 0.0, val supports: Boolean = false, val manifold: Boolean = true)
@Serializable data class PrintItem(val model: PrintModel, val estimate: PrintEstimate, val tier: String, val qty: Int = 1, val colour: String? = null, val filament: String = "PLA")
@Serializable data class CabinetItem(val item: String, val title: String, val qty: Int, val unitInr: Int, val kind: String)

/** Typed views of an order's raw items. */
fun Order.printItem(): PrintItem? = if (kind == "print" && items.isNotEmpty()) CounterJson.decodeFromJsonElement(PrintItem.serializer(), items[0]) else null
fun Order.cabinetItems(): List<CabinetItem> = if (kind == "cabinet") items.map { CounterJson.decodeFromJsonElement(CabinetItem.serializer(), it) } else emptyList()

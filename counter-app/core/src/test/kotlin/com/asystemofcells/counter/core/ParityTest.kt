package com.asystemofcells.counter.core

import kotlinx.serialization.json.*
import kotlin.math.abs
import kotlin.test.*

private fun res(name: String) = ParityTest::class.java.getResourceAsStream("/$name")!!.bufferedReader().readText()
private fun JsonElement.d() = jsonPrimitive.double
private fun JsonElement.i() = jsonPrimitive.int

class ParityTest {
    @Test fun `every transition equals the server's state machine`() {
        val f = Json.parseToJsonElement(res("machine.json")).jsonObject
        val states = f["states"]!!.jsonArray.map { it.jsonPrimitive.content }
        assertEquals(Status.entries.map { it.wire }.toSet(), states.toSet())
        var checked = 0
        for (kind in listOf("print", "cabinet")) for (s in states) {
            val want = f["machine"]!!.jsonObject[kind]!!.jsonObject[s]!!.jsonArray.map { it.jsonPrimitive.content }
            assertEquals(want, Machine.allowed(kind, Status.of(s)!!).map { it.wire }, "$kind $s")
            val na = f["nextAction"]!!.jsonObject["$kind:$s"]!!
            assertEquals(if (na is JsonNull) null else na.jsonPrimitive.content, Machine.nextAction(kind, Status.of(s)!!), "nextAction $kind $s")
            checked++
        }
        assertEquals(24, checked)
    }

    @Test fun `print quotes equal the server's, 72 of them`() {
        val f = Json.parseToJsonElement(res("quotes.json")).jsonObject["prints"]!!.jsonArray
        assertEquals(72, f.size)
        for (c in f) {
            val inp = c.jsonObject["input"]!!.jsonObject; val want = c.jsonObject["expect"]!!.jsonObject; val e = inp["est"]!!.jsonObject
            val got = Pricing.quotePrint(EstimateInput(e["massG"]!!.d(), e["printMin"]!!.d(), e["band"]!!.d()), inp["tier"]!!.jsonPrimitive.content, inp["qty"]!!.i(), inp["filament"]!!.jsonPrimitive.content, inp["zone"]!!.jsonPrimitive.content)
            val label = inp.toString()
            assertEquals(want["total"]!!.i(), got.total, "total $label")
            assertEquals(want["shipping"]!!.d(), got.shipping, "shipping $label")
            assertEquals(want["bandInr"]!!.i(), got.bandInr, "band $label")
            assertEquals(want["grams"]!!.i(), got.grams, "grams $label")
            assertTrue(abs(want["subtotal"]!!.d() - got.subtotal) < 0.006, "subtotal $label")
            assertTrue(abs(want["finish"]!!.d() - got.finish) < 0.006, "finish $label")
        }
    }

    @Test fun `cabinet quotes equal the server's`() {
        for (c in Json.parseToJsonElement(res("quotes.json")).jsonObject["cabinet"]!!.jsonArray) {
            val inp = c.jsonObject["input"]!!.jsonObject; val want = c.jsonObject["expect"]!!.jsonObject
            val lines = inp["lines"]!!.jsonArray.map { val l = it.jsonObject; CabinetLine(l["unitInr"]!!.d(), l["qty"]!!.i(), l["weightGrams"]!!.d(), l["fragile"]!!.jsonPrimitive.boolean) }
            val got = Pricing.quoteCabinet(lines, inp["zone"]!!.jsonPrimitive.content)
            assertEquals(want["total"]!!.d(), got.total, inp.toString()); assertEquals(want["shipping"]!!.d(), got.shipping); assertEquals(want["grams"]!!.i(), got.grams)
        }
    }

    @Test fun `owner list and detail from the real server decode, and the typed views work`() {
        val list = CounterJson.decodeFromString<OrderList>(res("owner-orders.json"))
        assertEquals(2, list.orders.size)
        assertTrue(list.orders.all { it.customer.firstName == "Asha" })
        val p = CounterJson.decodeFromString<OrderDetail>(res("owner-order-print.json"))
        assertEquals("print", p.order.kind); assertEquals(Status.REVIEWING, Status.of(p.order.status))
        assertEquals("cube.stl", p.order.printItem()!!.model.name); assertEquals("processed", p.order.printItem()!!.tier)
        assertNotNull(p.modelUrl); assertTrue(p.order.shipTo.oneLine().startsWith("1 Road"))
        val c = CounterJson.decodeFromString<OrderDetail>(res("owner-order-cabinet.json"))
        assertEquals(setOf("hyle-cell-brass", "inkwell-1962"), c.order.cabinetItems().map { it.item }.toSet())
        assertEquals(Status.ACCEPTED, Status.of(c.order.status)); assertNotNull(c.order.payment!!.shortUrl); assertNotNull(c.order.accepted)
        assertTrue(c.events.any { it.type == "accepted" })
    }
}

package com.asystemofcells.counter.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable data class Tier(val id: String, val name: String, val multiplier: Double, val adderInrPerPart: Double)
@Serializable data class TiersFile(val tiers: List<Tier>)
@Serializable data class PricingFile(val inrPerGram: Map<String, Double>, val inrPerHour: Double, val minimumInr: Double, val packagingInr: Double, val boxGrams: Double, val estimateBand: Double)
@Serializable data class Band(val maxGrams: Double, val inr: Double)
@Serializable data class Zone(val bands: List<Band>)
@Serializable data class ShippingFile(val packagingAllowancePct: Double, val fragileSurchargeInr: Double, val freeShippingOverInr: Map<String, Double?>, val zones: Map<String, Zone>)

data class Tables(val pricing: PricingFile, val tiers: TiersFile, val shipping: ShippingFile) {
    companion object {
        /** The bundled placeholder tables (the same files as the site's data folder). The server's number always wins; this is for the app's own previews. */
        fun bundled(): Tables {
            fun read(name: String) = Tables::class.java.getResourceAsStream("/tables/$name")!!.bufferedReader().readText()
            return Tables(CounterJson.decodeFromString(read("pricing.prints.json")), CounterJson.decodeFromString(read("finish-tiers.json")), CounterJson.decodeFromString(read("shipping.json")))
        }
    }
}

data class EstimateInput(val massG: Double, val printMin: Double, val band: Double? = null)
data class PrintQuote(val subtotal: Double, val finish: Double, val packaging: Double, val shipping: Double, val total: Int, val bandInr: Int, val grams: Int, val overTable: Boolean)
data class CabinetLine(val unitInr: Double, val qty: Int, val weightGrams: Double, val fragile: Boolean)
data class CabinetQuote(val subtotal: Double, val shipping: Double, val total: Double, val grams: Int, val overTable: Boolean)

/** A port of api/counter/_quote.js. QuoteParityTest checks 76 server-produced quotes against it. */
object Pricing {
    private fun round(x: Double) = Math.floor(x + 0.5)            // JS Math.round: half goes up
    private fun r2(x: Double) = round(x * 100) / 100

    private data class Ship(val inr: Double, val grams: Int, val over: Boolean)
    private fun shippingFor(grams: Double, zone: String, fragile: Boolean, subtotal: Double, t: ShippingFile, boxGrams: Double = 0.0): Ship {
        val z = t.zones[zone] ?: error("unknown zone $zone")
        val parcel = (grams + boxGrams) * (1 + t.packagingAllowancePct / 100)
        val band = z.bands.firstOrNull { parcel <= it.maxGrams }
        val b = band ?: z.bands.last()
        var inr = b.inr + if (fragile) t.fragileSurchargeInr else 0.0
        val free = t.freeShippingOverInr[zone]
        if (free != null && subtotal >= free) inr = 0.0
        return Ship(inr, round(parcel).toInt(), band == null)
    }

    fun quoteCabinet(lines: List<CabinetLine>, zone: String = "IN", t: Tables = Tables.bundled()): CabinetQuote {
        val subtotal = lines.sumOf { it.unitInr * it.qty }
        val ship = shippingFor(lines.sumOf { it.weightGrams * it.qty }, zone, lines.any { it.fragile }, subtotal, t.shipping)
        return CabinetQuote(subtotal, ship.inr, subtotal + ship.inr, ship.grams, ship.over)
    }

    fun quotePrint(est: EstimateInput, tier: String, qty: Int = 1, filament: String = "PLA", zone: String = "IN", fragile: Boolean = false, t: Tables = Tables.bundled()): PrintQuote {
        val tr = t.tiers.tiers.firstOrNull { it.id == tier } ?: error("unknown tier $tier")
        val material = est.massG * (t.pricing.inrPerGram[filament] ?: t.pricing.inrPerGram.getValue("PLA"))
        val machine = est.printMin / 60 * t.pricing.inrPerHour
        val base = maxOf(t.pricing.minimumInr, material + machine) * qty
        val finish = base * (tr.multiplier - 1) + tr.adderInrPerPart * qty
        val ship = shippingFor(est.massG * qty, zone, fragile, base + finish, t.shipping, t.pricing.boxGrams)
        val total = round(base + finish + t.pricing.packagingInr + ship.inr).toInt()
        return PrintQuote(r2(base), r2(finish), t.pricing.packagingInr, ship.inr, total, round(total * (est.band ?: t.pricing.estimateBand)).toInt(), ship.grams, ship.over)
    }
}

package com.asystemofcells.counter.data

import com.asystemofcells.counter.core.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiError(val status: Int, val code: String, message: String) : IOException(message)

/**
 * The owner endpoints of the Counter (api/counter/owner/*). Every action is one call and appends one event on the
 * server; the app never edits an order file. Razorpay secrets never reach the app: the server creates the links.
 */
class OwnerApi(private val base: () -> String, private val token: () -> String?, private val client: OkHttpClient = OkHttpClient.Builder().callTimeout(30, TimeUnit.SECONDS).build()) {
    private val json = "application/json; charset=utf-8".toMediaType()

    private suspend fun call(method: String, path: String, body: JsonObject? = null): String = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(base().trimEnd('/') + path)
            .header("Authorization", "Bearer ${token().orEmpty()}")
            .method(method, if (method == "GET") null else (body?.toString() ?: "{}").toRequestBody(json)).build()
        client.newCall(req).execute().use { res ->
            val text = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                val err = runCatching { CounterJson.parseToJsonElement(text) }.getOrNull()
                val e = (err as? JsonObject)?.get("error") as? JsonObject
                throw ApiError(res.code, (e?.get("code") as? JsonPrimitive)?.content ?: "http_${res.code}", (e?.get("message") as? JsonPrimitive)?.content ?: "The counter said ${res.code}.")
            }
            text
        }
    }

    suspend fun orders(all: Boolean = false): List<OrderSummary> = CounterJson.decodeFromString<OrderList>(call("GET", "/api/counter/owner/orders" + if (all) "?all=1" else "")).orders
    suspend fun order(id: String): OrderDetail = CounterJson.decodeFromString(call("GET", "/api/counter/owner/orders/$id"))

    suspend fun accept(id: String, total: Int?, note: String?): String = CounterJson.decodeFromString<AcceptResult>(call("POST", "/api/counter/owner/orders/$id/accept", buildJsonObject {
        if (total != null) put("total", total); if (!note.isNullOrBlank()) put("note", note)
    })).shortUrl
    suspend fun reject(id: String, reason: String) { call("POST", "/api/counter/owner/orders/$id/reject", buildJsonObject { put("reason", reason) }) }
    suspend fun advance(id: String, status: String, carrier: String? = null, tracking: String? = null) {
        call("POST", "/api/counter/owner/orders/$id/status", buildJsonObject { put("status", status); if (carrier != null) put("carrier", carrier); if (tracking != null) put("tracking", tracking) })
    }
    suspend fun rebuild() { call("POST", "/api/counter/owner/rebuild") }
    suspend fun markSoldOffline(item: String) { call("POST", "/api/counter/owner/catalog/sold", buildJsonObject { put("item", item) }) }
    suspend fun catalogState(): String = call("GET", "/api/counter/catalog-state")
}

package com.asystemofcells.counter.data

import com.asystemofcells.counter.core.Ntfy
import com.asystemofcells.counter.core.Push
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** The owner's own ntfy topic over its JSON stream. No Firebase, no Google push. Used while the app is in the foreground service; WorkManager polling covers the rest. */
class NtfyStream(private val url: String, private val topic: String, private val token: String?) {
    private val client = OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).build() // a stream: no read timeout

    fun pushes(): Flow<Push> = callbackFlow {
        val req = Request.Builder().url("${url.trimEnd('/')}/$topic/json").apply { if (!token.isNullOrBlank()) header("Authorization", "Bearer $token") }.build()
        val call = client.newCall(req)
        val reader = Thread {
            runCatching {
                call.execute().use { res ->
                    val src = res.body?.source() ?: return@use
                    while (!src.exhausted()) { Ntfy.parseLine(src.readUtf8Line().orEmpty())?.let { trySend(Ntfy.classify(it)) } }
                }
            }
            close()
        }.apply { isDaemon = true; start() }
        awaitClose { call.cancel(); reader.interrupt() }
    }.flowOn(Dispatchers.IO)
}

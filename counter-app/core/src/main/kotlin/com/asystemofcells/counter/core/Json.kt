package com.asystemofcells.counter.core

import kotlinx.serialization.json.Json

/** One Json for the whole app. The server may add fields; the app must not break on them. */
val CounterJson = Json { ignoreUnknownKeys = true; explicitNulls = false; coerceInputValues = true }

package com.asystemofcells.counter.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels

class MainActivity : ComponentActivity() {
    private val vm: CounterViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CounterTheme { CounterApp(vm) } }
        handle(intent)
        vm.refresh()
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); handle(intent) }

    /** asoc-counter://orders/<id> from a push opens the order. */
    private fun handle(i: Intent?) { i?.data?.takeIf { it.scheme == "asoc-counter" && it.host == "orders" }?.lastPathSegment?.let { vm.open(it) } }
}

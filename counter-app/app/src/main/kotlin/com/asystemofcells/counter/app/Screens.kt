package com.asystemofcells.counter.app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.asystemofcells.counter.core.*
import com.asystemofcells.counter.data.Settings

/** Rooms, not tabs: the inbox is home, the Cabinet is to its left and Settings to its right. An order is pushed over the top. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun CounterApp(vm: CounterViewModel) {
    val s by vm.state.collectAsStateWithLifecycle()
    val pager = rememberPagerState(initialPage = 1) { 3 }
    Box(Modifier.fillMaxSize().statusBarsPadding()) {
        HorizontalPager(pager) { page ->
            when (page) { 0 -> CabinetRoom(vm); 1 -> InboxRoom(s, vm); else -> SettingsRoom(s, vm) }
        }
        s.open?.let { OrderRoom(it, vm) }
        s.message?.let { m -> Snackbar(Modifier.align(Alignment.BottomCenter).padding(16.dp), action = { TextButton({ vm.dismissMessage() }) { Text("OK") } }) { Text(m) } }
    }
}


@Composable
fun InboxRoom(s: UiState, vm: CounterViewModel) {
    val groups = remember(s.orders) { Inbox.group(s.orders) }
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Row(Modifier.padding(vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Counter", fontSize = 28.sp, fontWeight = FontWeight.SemiBold); Spacer(Modifier.weight(1f))
            Text("${Inbox.badge(s.orders)} waiting", color = Tok.muted)
            TextButton({ vm.refresh() }) { Text(if (s.loading) "…" else "Refresh") }
        }
        if (!s.hasToken) Text("Add the owner token in Settings (swipe left).", color = Tok.muted)
        if (groups.isEmpty() && s.hasToken && !s.loading) Text("Nothing is waiting.", color = Tok.muted)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            groups.forEach { g ->
                item { Text(g.section.label, color = Tok.violet, modifier = Modifier.padding(top = 18.dp, bottom = 4.dp), fontWeight = FontWeight.Medium) }
                items(g.orders, key = { it.id }) { o ->
                    Row(Modifier.fillMaxWidth().clickable { vm.open(o.id) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        CellMark(lobesFor(o.nextAction), hollow = o.kind == "print")
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text("${o.customer.firstName}, ${o.customer.city}", fontSize = 16.sp)
                            Text((if (o.kind == "print") "Print" else "Cabinet") + " · " + o.summary, color = Tok.muted, fontSize = 13.sp, maxLines = 1)
                        }
                        Text("₹${o.total}", fontSize = 16.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun OrderRoom(d: OrderDetail, vm: CounterViewModel) {
    val o = d.order; val status = Status.of(o.status) ?: Status.PLACED
    BackHandler { vm.close() }
    var sheet by remember { mutableStateOf<OwnerAction?>(null) }
    val clip = LocalClipboardManager.current
    Surface(Modifier.fillMaxSize(), color = Tok.ground) {
        Column(Modifier.fillMaxSize().statusBarsPadding().padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { TextButton({ vm.close() }) { Text("Back") }; Spacer(Modifier.weight(1f)); Text(status.wire, color = Tok.muted) }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                Text(o.customer.name, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
                Text(o.customer.email + (o.customer.phone?.let { " · $it" } ?: ""), color = Tok.muted)
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) { Text(o.shipTo.oneLine(), Modifier.weight(1f)); TextButton({ clip.setText(AnnotatedString(o.shipTo.oneLine())) }) { Text("Copy") } }
                Spacer(Modifier.height(16.dp))
                o.printItem()?.let { p ->
                    Text("${p.model.name} · ${p.qty} × ${p.tier} · ${p.filament} ${p.colour.orEmpty()}")
                    Text("Estimate: ${"%.1f".format(p.estimate.massG)} g, ${p.estimate.printMin.toInt()} min" + if (p.estimate.supports) ", supports" else "", color = Tok.muted)
                    if (o.flags.isNotEmpty()) Text("Check: " + o.flags.joinToString(", "), color = Tok.violet)
                    d.modelUrl?.let { Text("The model is in private storage; open its link from the web ledger.", color = Tok.muted, fontSize = 13.sp) }
                }
                o.cabinetItems().forEach { Text("${it.title} × ${it.qty} · ₹${it.unitInr * it.qty}") }
                Spacer(Modifier.height(12.dp))
                Text("Quote ₹${o.quote.total}" + if (o.quote.bandInr > 0) " (± ₹${o.quote.bandInr})" else "")
                o.accepted?.let { Text("Accepted at ₹${it.total}" + (it.note?.let { n -> " · $n" } ?: ""), color = Tok.muted) }
                if (status == Status.PAID || o.payment?.status == "paid") Text("Paid", color = Tok.radium, fontWeight = FontWeight.Medium) // money arrived: local good news
                o.fulfilment.tracking?.let { Text("${o.fulfilment.carrier}: $it", color = Tok.muted) }
                o.customerNote?.let { Spacer(Modifier.height(8.dp)); Text("“$it”") }
                Spacer(Modifier.height(20.dp))
                Text("Timeline", color = Tok.violet)
                d.events.forEach { Text("${it.at.take(16).replace('T', ' ')}  ${it.type}${it.note?.let { n -> ": $n" } ?: ""}", color = Tok.muted, fontSize = 13.sp) }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScrollSafe()) {
                OwnerAction.available(o.kind, status).forEach { a ->
                    Button({ sheet = a }) { Text(when (a) { OwnerAction.Accept -> "Accept"; OwnerAction.Reject -> "Reject"; OwnerAction.StartMaking -> "Start making"; OwnerAction.Finishing -> "Finishing"; OwnerAction.Dispatch -> "Dispatch"; OwnerAction.Delivered -> "Delivered" }) }
                }
            }
        }
    }
    sheet?.let { a ->
        ActionSheet(a, o, onDismiss = { sheet = null }) { f ->
            when (a) {
                OwnerAction.Accept -> vm.accept(o.id, f["total"]?.toIntOrNull(), f["note"])
                OwnerAction.Reject -> vm.reject(o.id, f["reason"].orEmpty())
                OwnerAction.StartMaking -> vm.advance(o.id, "in_production")
                OwnerAction.Finishing -> vm.advance(o.id, "finishing")
                OwnerAction.Dispatch -> vm.advance(o.id, "dispatched", f["carrier"], f["tracking"])
                OwnerAction.Delivered -> vm.advance(o.id, "delivered")
            }
            sheet = null
        }
    }
}

private fun Modifier.horizontalScrollSafe() = this.fillMaxWidth()

@Composable
private fun ActionSheet(a: OwnerAction, o: Order, onDismiss: () -> Unit, onGo: (Map<String, String>) -> Unit) {
    val fields: List<Pair<String, String>> = when (a) {
        OwnerAction.Accept -> listOf("total" to "Total (₹), blank for ${o.quote.total}", "note" to "Note the customer will see")
        OwnerAction.Reject -> listOf("reason" to "Reason (the customer sees it)")
        OwnerAction.Dispatch -> listOf("carrier" to "Carrier", "tracking" to "Tracking number")
        else -> emptyList()
    }
    val values = remember { mutableStateMapOf<String, String>() }
    AlertDialog(onDismissRequest = onDismiss,
        confirmButton = { TextButton({ onGo(values.toMap()) }) { Text("Do it") } },
        dismissButton = { TextButton(onDismiss) { Text("Cancel") } },
        title = { Text(a.toString().substringAfterLast('.').substringBefore('@')) },
        text = { Column { if (fields.isEmpty()) Text("This records the step and tells the customer where it applies."); fields.forEach { (k, label) -> OutlinedTextField(values[k].orEmpty(), { values[k] = it }, label = { Text(label) }, singleLine = true) } } })
}

@Composable
fun CabinetRoom(vm: CounterViewModel) {
    var item by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(20.dp)) {
        Text("The Cabinet", fontSize = 28.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(16.dp))
        Text("Sold in person? Mark the piece sold so the site stops offering it.", color = Tok.muted)
        OutlinedTextField(item, { item = it }, label = { Text("Piece (its page name)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Button({ if (item.isNotBlank()) vm.markSold(item.trim()) }) { Text("Mark sold") }
        Spacer(Modifier.height(24.dp))
        Button({ vm.rebuild() }) { Text("Rebuild the site") }
        Text("Frees expired holds, closes unpaid orders, and refreshes the site's view of what is available.", color = Tok.muted, fontSize = 13.sp)
    }
}

@Composable
fun SettingsRoom(s: UiState, vm: CounterViewModel) {
    var base by remember(s.settings) { mutableStateOf(s.settings.apiBase) }
    var token by remember { mutableStateOf("") }
    var ntfy by remember(s.settings) { mutableStateOf(s.settings.ntfyUrl) }
    var topic by remember(s.settings) { mutableStateOf(s.settings.ntfyTopic) }
    var ntfyToken by remember { mutableStateOf("") }
    var poll by remember(s.settings) { mutableStateOf(s.settings.pollMinutes.toString()) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Settings", fontSize = 28.sp, fontWeight = FontWeight.SemiBold)
        OutlinedTextField(base, { base = it }, label = { Text("Counter address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(token, { token = it }, label = { Text(if (s.hasToken) "Owner token (saved; type to replace)" else "Owner token") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(ntfy, { ntfy = it }, label = { Text("ntfy server") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(topic, { topic = it }, label = { Text("ntfy topic") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(ntfyToken, { ntfyToken = it }, label = { Text("ntfy token, if the topic is protected") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(poll, { poll = it.filter(Char::isDigit) }, label = { Text("Poll every (minutes, 15 at least)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Button({ vm.saveSettings(Settings(base, ntfy, topic, poll.toIntOrNull() ?: 15), token, ntfyToken) }) { Text("Save") }
        Text("The token is kept in the Android Keystore and goes only to the address above. This app has no analytics and no crash reporting to anyone.", color = Tok.muted, fontSize = 13.sp)
    }
}

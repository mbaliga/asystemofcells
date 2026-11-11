package com.asystemofcells.counter.app

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** Hyle's ground and violet. When the Hyle design system is added as a composite build, these tokens come from it. */
object Tok {
    val ground = Color(0xFF07070A); val ink = Color(0xFFEDEBF5); val muted = Color(0xFF8E8C99)
    val violet = Color(0xFF8E7BFF)   // the owner's own actions
    val radium = Color(0xFFC8FF4D)   // money arrived: local good news
}

@Composable fun CounterTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = darkColorScheme(background = Tok.ground, surface = Tok.ground, onBackground = Tok.ink, onSurface = Tok.ink, primary = Tok.violet, onPrimary = Tok.ground), content = content)

/** Status is a shape and a label, never red or green: an organic mark with a number of lobes per kind of work. */
@Composable fun CellMark(lobes: Int, size: Dp = 18.dp, color: Color = Tok.violet, hollow: Boolean = false) {
    Canvas(Modifier.size(size)) {
        val c = Offset(this.size.width / 2, this.size.height / 2); val r = this.size.minDimension / 2 * 0.82f
        val p = Path()
        for (i in 0..120) {
            val a = (i / 120f) * 2 * PI.toFloat()
            val rr = r * (1f + 0.14f * sin(lobes * a))
            val x = c.x + rr * cos(a); val y = c.y + rr * sin(a)
            if (i == 0) p.moveTo(x, y) else p.lineTo(x, y)
        }
        p.close()
        if (hollow) drawPath(p, color, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.5f)) else drawPath(p, color)
    }
}

fun lobesFor(action: String?) = when (action) { "decide" -> 3; "wait-for-model" -> 4; "waiting-for-payment" -> 5; "make" -> 6; "pack" -> 7; else -> 8 }

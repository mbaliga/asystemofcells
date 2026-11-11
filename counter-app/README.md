# Counter for Android

The owner's orders app for the asystemofcells shop counter: orders arrive on the phone, accept or reject, the customer pays, make and pack, dispatch, mark delivered. One user.

- **`:core`**: pure JVM. The order model, the state machine, quote calculation, the inbox grouping and ntfy parsing. **Tested here against fixtures made by the real server code** (72 print quotes, 4 cabinet quotes, every state transition, a real owner order list and detail).
- **`:data`**: Android. The owner-endpoint client (OkHttp), Keystore token store, ntfy stream, WorkManager poll.
- **`:app`**: Compose. Rooms: the inbox is home, the Cabinet is left, Settings is right; an order is pushed over the top. Status is a mark and a word, never red or green.

```
./gradlew :core:test            # bare JDK 21, no Android SDK needed
./gradlew :app:assembleDebug    # needs ANDROID_HOME (CI has it)
node tools/gen-fixtures.mjs     # regenerate the parity fixtures (from the asystemofcells repo root)
```

## Environment honesty
`:core` is machine-verified. `:data` and `:app` were written without an Android SDK and **have not been compiled or run**; CI is the first build, and device behaviour is owner-verified.

## Not built yet
Room cache and offline action queue, the foreground ntfy service wired to the stream, search/jump, the Hyle design system (tokens are inlined in `Theme.kt`), vacation mode and print capacity (they need server support), an Orrery widget, a Wear OS glance.

## Where it lives
This directory is `counter-app/` inside `mbaliga/asystemofcells`. It is laid out to be lifted into its own repo, `mbaliga/asoc-counter-app`:

```
git subtree split --prefix=counter-app -b counter-app-only
git push git@github.com:mbaliga/asoc-counter-app.git counter-app-only:main
```

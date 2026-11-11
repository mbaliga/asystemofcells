pluginManagement {
    repositories { gradlePluginPortal(); google(); mavenCentral() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "asoc-counter-app"
include(":core")
// The Android modules are only included when an SDK is present, so `./gradlew :core:test` works on a bare JDK
// (the container, and the CI job that has no SDK). CI always has one.
val hasAndroidSdk = System.getenv("ANDROID_HOME") != null || System.getenv("ANDROID_SDK_ROOT") != null || file("local.properties").exists()
if (hasAndroidSdk) {
    include(":data")
    include(":app")
}

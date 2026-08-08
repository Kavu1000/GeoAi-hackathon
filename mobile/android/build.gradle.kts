allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// Workaround for old, unmaintained plugins (isar_flutter_libs 3.1.0+1 and
// objectbox_flutter_libs, both last released years ago — the latter pulled
// in transitively by flutter_map_tile_caching) that don't meet what this
// Flutter SDK's default toolchain now expects: no `namespace` set, and/or a
// compileSdk too old for modern androidx transitive deps other plugins
// bring in. Applied to every library subproject rather than a hand-picked
// list — the `namespace == null` / `compileSdk < 36` guards make this a
// no-op for plugins that already set a modern value themselves, so it's
// safe to leave broad rather than re-discovering each legacy plugin one
// Gradle run at a time.
//
// Uses AGP's Variant API (`finalizeDsl`) rather than afterEvaluate/direct
// assignment: this build's evaluation order (evaluationDependsOn(":app")
// above forces some subprojects to evaluate as a side effect of :app's
// dependency resolution) means AGP can read namespace/compileSdk to build
// its internal variant model *before* a plain `subprojects { afterEvaluate
// { ... } }` or even a direct `plugins.withId { ... }` assignment gets a
// chance to run — both fail with "It is too late to set
// namespace/compileSdk". `finalizeDsl` is the hook AGP itself schedules
// specifically to still be safe at that point, regardless of this ordering.
// https://developer.android.com/build/publish-library/upgrade-library#new_android_gradle_plugin
subprojects {
    plugins.withId("com.android.library") {
        extensions.configure<com.android.build.api.variant.LibraryAndroidComponentsExtension> {
            finalizeDsl { extension ->
                if (extension.namespace == null) {
                    val manifestFile = layout.projectDirectory.file("src/main/AndroidManifest.xml").asFile
                    if (manifestFile.exists()) {
                        val pkg = Regex("""package="([^"]+)"""").find(manifestFile.readText())?.groupValues?.get(1)
                        if (pkg != null) extension.namespace = pkg
                    }
                }
                // Match the app's compileSdk (flutter.compileSdkVersion for
                // this Flutter SDK — see FlutterExtension.kt). Compiling
                // against a newer SDK than a library targets is safe; it
                // doesn't change its runtime behavior.
                if ((extension.compileSdk ?: 0) < 36) {
                    extension.compileSdk = 36
                }
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

# Android compact UI QA — 1.3.2

final result: passed

Latest direction: remove mobile cover artwork, tnkr/widget branding and Done/X popup bar; bring the compact task surface to the native widget and allow smaller sizing.

Implemented a cover-free rounded surface with Things to do, tracker/settings actions, three tabs, task list and sage add control. Removed mobile cover settings while preserving desktop artwork and saved data. Popup dismissal remains available through Android Back. Native widget target is 3x3, with 250dp minimum width and 220dp minimum height; actual launcher grids determine supported sizes.

Opened and inspected qa/tnkr-native-widget.png and qa/tnkr-compact-panel.png from Android 15. Native widget shows all five sample rows at 320x420 without artwork. Popup shows no branding/Done bar or cover. Corrected an inherited desktop flex rule that made popup tab widths unequal, rebuilt and reran the compact-panel test for the final screenshot.

Verification: all five Android instrumentation tests passed (compact popup, keyboard caret, offline data, floating editor and native widget). Final compact-popup test passed again after tab correction. 25 JavaScript tests, 4 Sites tests, native unit tests and signed APK verification passed. Physical phone launcher sizing remains device-dependent.

## September 29 regression update — 1.3.5
Native widget: press ripple feedback, stable task IDs, direct RemoteCollectionItems on Android 12+, and skipped updates for unchanged visible content. Older Android retains service-based collections. These reduce reload churn; physical launcher motion smoothness is not certified by emulator tests.
Notes: preserve/restore selection across toolbar focus, semantic execCommand markup, explicit italic synthesis with Geist. Android test verifies italic, bold, heading and bullet formatting after editor focus loss and checks saved notes.
Reminders: Dismiss, Snooze 10 min, Done, in that order. Instrumentation posts a real notification and verifies actions; Dismiss removes it without completing its task.
Validation: all 7 Android instrumentation tests, native unit tests, 25 JS tests, 4 Sites tests, APK build and signing passed.

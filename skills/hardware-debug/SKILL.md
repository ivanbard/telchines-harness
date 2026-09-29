---
name: hardware-debug
description: Diagnose RTL compile failures using project evidence and an actual compiler check.
---

# Hardware debug

1. Read the failing RTL, relevant specs, and logs. Use `tel_retrieve` when the project is initialized with Telchines.
2. Run `rtl_check` on the relevant source files to reproduce the failure.
3. Make the smallest justified edit, then rerun the same check.
4. Report the compiler result, changed files, and what still needs simulation or formal verification.

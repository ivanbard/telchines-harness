# Telchines Harness

An early hardware development agent built as a [Pi package](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md). Pi runs the conversation and editing tools; this package adds hardware guidance, cited Telchines retrieval, and an RTL compile check.

## Try it

Install [Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent), [Telchines](https://github.com/ivanbard/telchines) (for retrieval), and Icarus Verilog (for `rtl_check`). From a hardware project, initialize Telchines once and start Pi with this package:

```sh
tel project init .
tel index
pi -e "C:\Users\user\Desktop\pc\Repositories\telchines-harness"
```

Ask Pi to diagnose a compile failure or invoke `/skill:hardware-debug`. `rtl_check` currently supports `.v` and `.sv` files with Icarus Verilog; a passing result is a compile check, not simulation or formal proof. The package does not apply Telchines repair workflows or create `.tel/` run records yet.

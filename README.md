# tiny-stack-vm-01-run-20261122

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A tiny stack VM for make.fun's "Build a tiny stack virtual machine, 22 November 2026" bounty. `main.ts` runs all 40 programs of a set against the ISA (32-bit wrapping integers, 256-value stack, 64-deep call stack, 256 words of memory, ten traps with their own exit codes) and writes each instance's stdout and exit code, matching the reference VM step for step.

## Run it

```sh
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=9eqj58cc) · AI agents build software for cash rewards</sub>

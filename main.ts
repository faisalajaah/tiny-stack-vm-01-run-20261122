// Tiny stack VM: runs each program of a set against make.fun's tiny stack ISA
// (kit generator/subject/ISA.md) and writes stdout.bin + exit.txt per instance.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// [opcode, immediate bytes, pops, pushes] per ISA.md's opcode table.
const SPEC = [[0,0,0,0],[1,1,0,1],[2,4,0,1],[3,0,1,0],[4,0,1,2],[5,0,2,2],[6,0,2,3],[7,0,3,3],[16,0,2,1],[17,0,2,1],[18,0,2,1],[19,0,2,1],[20,0,2,1],[21,0,2,1],[22,0,2,1],[23,0,1,1],[24,0,2,1],[25,0,2,1],[26,0,2,1],[27,0,1,1],[28,0,2,1],[29,0,2,1],[30,0,2,1],[32,0,2,1],[33,0,2,1],[34,0,2,1],[48,2,0,0],[49,2,1,0],[50,2,1,0],[51,2,0,0],[52,0,0,0],[64,0,1,1],[65,0,2,0],[80,0,1,0],[81,0,1,0],[82,0,0,1],[83,0,1,0]];
const IMM = new Int8Array(256).fill(-1), POPS = new Int8Array(256), PUSHES = new Int8Array(256);
for (const [o, i, p, u] of SPEC) { IMM[o] = i; POPS[o] = p; PUSHES[o] = u; }
function run(prog, inp) {
  const n = prog.length, D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), out = new Uint8Array(65536);
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (e) => ({ stdout: out.slice(0, ol), exit: e });
  for (;;) {
    // ISA.md "One step", in its order: step limit, pc range, opcode known,
    // immediate fits, then the step counts and the stack is checked.
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = prog[pc], im = IMM[op];
    if (im < 0) return done(5);
    if (pc + im >= n) return done(9);
    steps++;
    if (sp < POPS[op]) return done(2);
    if (sp - POPS[op] + PUSHES[op] > 256) return done(3);
    const nx = pc + 1 + im;
    let np = nx;
    switch (op) {
      case 0: return done(0);
      case 1: D[sp++] = (prog[pc + 1] << 24) >> 24; break;
      case 2: D[sp++] = prog[pc + 1] | (prog[pc + 2] << 8) | (prog[pc + 3] << 16) | (prog[pc + 4] << 24); break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 23: D[sp - 1] = -D[sp - 1] | 0; break;
      case 27: D[sp - 1] = ~D[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = D[sp - 1], a = D[sp - 2];
        let r = 0;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) { if (!b) return done(4); r = (a / b) | 0; }
        else if (op === 20) { if (!b) return done(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (op === 21) { if (!b) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 22) { if (!b) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; D[sp++] = r;
        break;
      }
      case 48: case 49: case 50: {
        const rel = ((prog[pc + 1] | (prog[pc + 2] << 8)) << 16) >> 16;
        let take = op === 48;
        if (op !== 48) { const v = D[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) np = nx + rel;
        break;
      }
      case 51:
        if (cp === 64) return done(7);
        C[cp++] = nx; np = prog[pc + 1] | (prog[pc + 2] << 8);
        break;
      case 52:
        if (!cp) return done(8);
        np = C[--cp];
        break;
      case 64: {
        const a = D[sp - 1];
        if (a < 0 || a > 255) return done(6);
        D[sp - 1] = M[a];
        break;
      }
      case 65: {
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a > 255) return done(6);
        sp -= 2; M[a] = v;
        break;
      }
      case 80: {
        const s = String(D[sp - 1]);
        if (ol + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 81:
        if (ol + 1 > 65536) return done(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 82: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 83: return done(D[--sp] & 255);
      default: return done(5);
    }
    pc = np;
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? "/input", O = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, "program.bin")), readFileSync(join(I, id, "input.bin")));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, "stdout.bin"), r.stdout);
  writeFileSync(join(O, id, "exit.txt"), r.exit + "\n");
}

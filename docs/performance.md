# Performance

## Steady-state architecture

One React/Fabric tree is mounted regardless of how many copies are visible.
iOS uses compositor replication and Android replays existing child display
lists. Automatic motion has zero per-frame JavaScript and performs no React
layout. When content fits, is paused, reduced-motion, detached, backgrounded,
or offscreen, the renderer performs no continuous frame work.

## Cost model

The generic renderer is intentionally content-dependent:

- simple text, images, icons, and badges should approach the specialized native
  renderer during steady motion;
- React reconciliation and layout still apply when arbitrary children update;
- width-changing updates cost one layout event and native period rebase;
- continuously invalidating charts or large images increase display-list,
  texture, and redraw cost;
- many simultaneous marquees multiply the one child tree's view and memory
  cost, even though each marquee avoids visual-copy trees.

Ordinary images update one mounted view and every visual replica reflects the
same backing content. External surfaces are outside the performance and
correctness contract.

## Acceptance protocol

Use Release builds on representative physical 60 Hz and 120 Hz devices. Compare
the archived optimized renderer at `stock-renderer-v1-backup` with the generic
renderer using identical visual children, speed, update cadence, device state,
and capture order. Report medians plus p95/p99 across at least five alternating
runs.

Required invariants include zero per-frame JavaScript, zero blank frames, no
seam discontinuity, bounded memory after warm-up, no lifecycle leaks, and zero
motion callbacks while stationary. Emulator and simulator measurements are
diagnostic only.

## Generic renderer diagnostic

The generic Android Release example mounts ten simultaneous child trees, each
containing an `Image`, nested text, badge views, and a composed chart. Four
stabilized API 35 host-GPU emulator captures produced 0.27–0.68% janky frames,
21–24 ms p95, and 26–32 ms p99. The archived specialized renderer's comparable
single diagnostic was 0.80% with a 32 ms p99.

This indicates no obvious steady-state regression despite the more complex
child hierarchy, but it is not a claim of superiority: emulator scheduling,
capture order, and different child pixels make the runs unsuitable as a release
gate. The physical-device alternating protocol above remains required.

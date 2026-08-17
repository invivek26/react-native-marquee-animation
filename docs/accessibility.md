# Accessibility

## One semantic representation

Every marquee requires an explicit `accessibilityLabel`. The native host is the
only accessibility element; the one live child tree and all visual replicas are
hidden from VoiceOver and TalkBack. This prevents duplicate traversal and keeps
focus stationary while pixels move.

Use a concise localized summary of the logical content. Do not place controls,
links, text inputs, or other interactive semantics inside marquee children.

## Reduced Motion

System Reduce Motion is respected by default and observed while mounted.
Enabling it immediately stops translation and presents the current content at a
deterministic stationary position. Disabling it resumes native motion.

No display link, frame callback, animator, timer, or JavaScript interval remains
active solely for marquee motion while Reduce Motion is enabled.

## Required verification

- Exactly one accessibility node and announcement per marquee.
- Updated host label after logical content changes.
- Stable focus while content pixels and width change.
- No duplicate semantics at a visual seam.
- Static readable content under Reduce Motion.
- Normal Dynamic Type, font scaling, contrast, and image descriptions are
  summarized by the host label rather than exposed as moving descendants.

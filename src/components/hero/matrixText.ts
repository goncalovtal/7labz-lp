const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\'

/** One full loop, in seconds: decode left → right, hold, dissolve right → left. */
const CYCLE = 4.4
const DECODE_END = 1.2
const HOLD_END = 3.4
/** How often the scrambled characters flip. Low on purpose, it reads as terminal output. */
const FRAME_MS = 70

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
}

/**
 * Drives every `[data-matrix]` label under `root`. Each label holds one span per
 * character; characters not yet decoded flip through random glyphs and carry
 * `data-scrambling` for styling. Labels are queried each frame, so cloned copies
 * (the slider duplicates its cards as plain DOM) animate too.
 */
export function runMatrixText(root: HTMLElement): () => void {
  const tick = () => {
    const now = performance.now() / 1000

    root.querySelectorAll<HTMLElement>('[data-matrix]').forEach((label, index) => {
      const text = label.dataset.matrix ?? ''
      const chars = label.children
      const length = chars.length

      // Offset each label so the cards never pulse in sync.
      const t = (now + index * 0.83) % CYCLE
      let resolved: number
      if (t < DECODE_END) resolved = Math.floor((t / DECODE_END) * (length + 1))
      else if (t < HOLD_END) resolved = length
      else resolved = length - Math.floor(((t - HOLD_END) / (CYCLE - HOLD_END)) * (length + 1))

      for (let i = 0; i < length; i++) {
        const char = chars[i] as HTMLElement
        const final = text[i]
        const settled = final === ' ' || i < resolved
        const next = settled ? final : randomGlyph()

        if (char.textContent !== next) char.textContent = next
        char.toggleAttribute('data-scrambling', !settled)
      }
    })
  }

  tick()
  const timer = window.setInterval(tick, FRAME_MS)
  return () => window.clearInterval(timer)
}

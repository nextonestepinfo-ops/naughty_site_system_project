/* global React */
// =====================================================
// NAUGHTY — section-transition gimmick
//   現行 production-21 の思想を継承:
//   セクション移動の瞬間に「背景模様が大きく動く」控えめな演出。
//   triggerPatternShift(sectionId) + .is-pattern-shifting
//   派手なフルスクリーンフラッシュは営業用オプション (NTY_FLASH)。
// =====================================================

(function () {
  let shiftTimer = null;
  let dir = 1;

  // Toggle to true for the old-style fullscreen flash (営業用オプション).
  window.NTY_FLASH = window.NTY_FLASH || false;

  window.triggerPatternShift = function (sectionId) {
    const stage = document.querySelector(".bg-stage");
    const root = document.querySelector(".nty");
    if (!stage) return;

    // Alternate direction each call so the motif drifts back and forth
    dir *= -1;
    stage.style.setProperty("--shift-dir", dir);

    // Per-section accent / tone (黒土側で再設計した配色)
    if (root && sectionId) {
      const meta = (window.NTY?.sections || []).find((s) => s.id === sectionId);
      root.setAttribute("data-active-section", sectionId);
      if (meta) root.setAttribute("data-active-tone", meta.tone);
    }

    // Restart the big-pattern move
    stage.classList.remove("is-pattern-shifting");
    // force reflow so the animation re-triggers
    void stage.offsetWidth;
    stage.classList.add("is-pattern-shifting");

    if (window.NTY_FLASH) {
      stage.classList.remove("is-flashing");
      void stage.offsetWidth;
      stage.classList.add("is-flashing");
    }

    clearTimeout(shiftTimer);
    shiftTimer = setTimeout(() => {
      stage.classList.remove("is-pattern-shifting");
      stage.classList.remove("is-flashing");
    }, 1100);
  };

  // React layer: renders the moving background + wires scroll detection.
  function PatternBackground() {
    const { useEffect, useRef } = React;
    const active = useRef(null);

    useEffect(() => {
      const sections = Array.from(document.querySelectorAll("[data-section-id]"));
      if (!sections.length) return;

      const io = new IntersectionObserver(
        (entries) => {
          // pick the most-visible intersecting section
          let best = null;
          let bestRatio = 0;
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio > bestRatio) {
              bestRatio = e.intersectionRatio;
              best = e.target;
            }
          });
          if (!best) return;
          const id = best.getAttribute("data-section-id");
          if (id && id !== active.current) {
            active.current = id;
            window.triggerPatternShift(id);
          }
        },
        { threshold: [0.25, 0.5, 0.75], rootMargin: "-20% 0px -40% 0px" }
      );
      sections.forEach((s) => io.observe(s));
      return () => io.disconnect();
    }, []);

    return (
      <div className="bg-stage" aria-hidden="true">
        <div className="bg-pattern bg-dots" />
        <div className="bg-pattern bg-grid" />
        <div className="bg-pattern bg-diagonals" />
        <div className="bg-wing bg-wing-l" />
        <div className="bg-wing bg-wing-r" />
        <div className="bg-flash" />
      </div>
    );
  }

  window.PatternBackground = PatternBackground;
})();

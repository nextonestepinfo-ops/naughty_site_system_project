/* global React */
// =====================================================
// naughty — scroll-linked accents
//   • Top progress bar (pink)
//   • Section reveal-on-scroll (fade-up)
//   • Right-side scroll indicator with section name
// =====================================================

function ScrollAccents({ variant }) {
  const { useEffect, useState, useRef } = React;
  const [progress, setProgress] = useState(0);
  const [section, setSection] = useState("00 · INTRO");
  const rafRef = useRef(0);

  // Wait for the containing scroll element. Inside DesignCanvas/iframe artboards,
  // the scroll happens on `documentElement` or an ancestor. Listen on the
  // window of the artboard's document and on `document`.
  useEffect(() => {
    const doc = document;
    const root = doc.documentElement;

    const measure = () => {
      const sh = root.scrollHeight - root.clientHeight;
      const st = root.scrollTop || doc.body.scrollTop || 0;
      const p = sh > 0 ? Math.max(0, Math.min(1, st / sh)) : 0;
      setProgress(p);

      // Find which section is most central in viewport
      const sections = doc.querySelectorAll("[data-screen-label]");
      const center = (window.innerHeight || root.clientHeight) * 0.4;
      let best = null;
      let bestDist = Infinity;
      sections.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > (window.innerHeight || root.clientHeight)) return;
        const d = Math.abs(r.top - center);
        if (d < bestDist) { bestDist = d; best = s; }
      });
      if (best) {
        const label = best.getAttribute("data-screen-label") || "";
        setSection(label.toUpperCase());
      }
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        measure();
        rafRef.current = 0;
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    doc.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      doc.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // IntersectionObserver-based reveal for sections + key children
  useEffect(() => {
    const targets = document.querySelectorAll(
      ".section, .nty .cta-strip, .nty .jump-nav, .nty .foot, .nty .cast-card, .nty .news-row, .nty .matrix-wrap"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  if (variant === "mobile") {
    // simpler accents on mobile — just the bar
    return (
      <>
        <div className="scroll-bar" aria-hidden="true">
          <div className="scroll-bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="scroll-bar" aria-hidden="true">
        <div className="scroll-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="scroll-rail" aria-hidden="true">
        <div className="scroll-rail-track">
          <div className="scroll-rail-knob" style={{ top: `${progress * 100}%` }}>
            <span className="knob-dot" />
            <span className="knob-pct">{Math.round(progress * 100)}%</span>
          </div>
        </div>
        <div className="scroll-rail-label">
          <span>{section}</span>
        </div>
      </div>
    </>
  );
}

window.ScrollAccents = ScrollAccents;

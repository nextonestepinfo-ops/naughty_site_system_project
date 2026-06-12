/* global React */
// =====================================================
// naughty — Loading screen
//   Inspired by cho-kaguyahime.com's loader: minimal,
//   centered "LOADING" word on a pale ground. We layer
//   our own personality on top (mono counter, pink dot,
//   tiny JP subtitle) but keep the silhouette quiet.
//
//   <Loading variant="desktop" replayKey={n} />
//   Mount inside .nty as the LAST child.
// =====================================================

const { useEffect, useState, useRef } = React;

function Loading({ variant = "desktop", replayKey = 0, duration = 2200 }) {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState("loading"); // loading → out → done
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    setPct(0);
    setPhase("loading");
    startRef.current = performance.now();

    // Eased schedule with two natural stalls so the counter
    // feels real, not just a linear ramp.
    const schedule = (t) => {
      if (t < 0.30) return (t / 0.30) * 28;
      if (t < 0.42) return 28 + ((t - 0.30) / 0.12) * 4;   // stall
      if (t < 0.78) return 32 + ((t - 0.42) / 0.36) * 49;
      if (t < 0.86) return 81 + ((t - 0.78) / 0.08) * 3;   // stall
      return 84 + ((t - 0.86) / 0.14) * 16;
    };

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      // Tiny digit twitch — only after 5% so it doesn't flicker at start.
      const jitter = t > 0.05 ? (Math.random() - 0.5) * 0.9 : 0;
      const value = Math.max(0, Math.min(100, schedule(t) + jitter));
      setPct(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPct(100);
        setTimeout(() => setPhase("out"), 320);
        setTimeout(() => setPhase("done"), 320 + 700);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [replayKey, duration]);

  if (phase === "done") return null;

  const n = Math.min(100, Math.floor(pct));
  const padded = String(n).padStart(3, "0");

  return (
    <div
      className={`loader is-${phase}`}
      data-variant={variant}
      aria-hidden="true"
    >
      {/* The single word — kaguyahime-style centerpiece */}
      <div className="loader-stage">
        <div className="loader-mark display" aria-label="LOADING">
          {/* Each letter is its own span so we can stagger reveals */}
          {"LOADING".split("").map((ch, i) => (
            <span
              key={i}
              className="loader-mark-ch"
              style={{ animationDelay: `${0.06 * i}s` }}
            >{ch}</span>
          ))}
          <span className="loader-mark-dot">.</span>
        </div>

        <div className="loader-jp ja-display">
          <span className="loader-pink-dot" />
          <span>ただいま準備中</span>
          <span className="loader-jp-sep">/</span>
          <span>Please wait a moment</span>
        </div>
      </div>

      {/* Tiny corner meta — kept restrained */}
      <div className="loader-corner loader-corner-tl mono">
        <span>naughty</span>
        <span className="loader-corner-dim">/ shibuya, tokyo</span>
      </div>

      <div className="loader-corner loader-corner-tr mono">
        <span className="loader-corner-dim">© 2026</span>
      </div>

      {/* Counter + thin line at the bottom edge */}
      <div className="loader-foot">
        <div className="loader-foot-row">
          <span className="mono loader-foot-label">NOW LOADING</span>
          <span className="loader-count mono">
            <span>{padded}</span>
            <span className="loader-count-unit">%</span>
          </span>
        </div>
        <div className="loader-rule">
          <div
            className="loader-rule-fill"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}

window.Loading = Loading;

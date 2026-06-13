/* global React */
// =====================================================
// naughty — Top page (Variant A · MONO EDITORIAL + pink)
// Sections: Nav, FV, Concept, Marquee
// =====================================================

const { useEffect, useRef, useState } = React;

// ─── Nav ─────────────────────────────────────────────
function Nav({ variant }) {
  return (
    <header className="nav">
      <div className="left" style={{ fontSize: "0px", fontFamily: "BlinkMacSystemFont", fontWeight: "100", lineHeight: "0", width: "0px", height: "0px", opacity: "0", gap: "0px" }}>
        <span className="dot" />
        <span>OPEN 20:00 — 26:00</span>
        <span style={{ opacity: 0.45 }}>/ TUE → SUN</span>
      </div>
      <a className="logo" href="#top" style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center" }}>
        <img src="assets/logo-naughty-dark.png" alt="naughty" style={{ height: 32, width: "auto", objectFit: "cover" }} />
      </a>
      <div className="right">
        <a className="cta pink reserve" style={{ padding: "10px 16px" }}>
          RESERVE <span style={{ marginLeft: 4 }}>→</span>
        </a>
        <button className="menu-btn" type="button">
          <img src="assets/icon-menu-devil.png" alt="" />
          <span>MENU</span>
        </button>
      </div>
    </header>);

}

// ─── First View ─────────────────────────────────────
function FV({ variant, copy, fvStyle }) {
  const [curtainKey, setCurtainKey] = useState(0);
  const [order, setOrder] = useState([0, 1, 2, 3, 4]);
  // Whether the cast is currently shown as real photos (true) or illustrations
  // (false). Flipped collectively for all 5 girls so the lineup is always
  // either *entirely* illustration or *entirely* real-photo.
  const [showReal, setShowReal] = useState(false);
  // `glitching` drives the .is-glitching class on both the cast row and the
  // wordmark wrapper (for the noise overlay). Keeping it in React state —
  // rather than touching classList directly — is critical: when we also call
  // setOrder/setShowReal during a cycle, React re-renders and rewrites
  // className from props. If `.is-glitching` lived only on the DOM, React
  // would strip it on the next render and the animation would abort
  // mid-cycle. Owning it in state means it survives the swap render.
  const [glitching, setGlitching] = useState(false);
  const heroRef = useRef(null);

  const replayCurtain = () => setCurtainKey((k) => k + 1);

  // Glitch + noise + cast swap, all driven from a single React-state cycle.
  // Putting the .is-glitching modifier in React state (rather than touching
  // classList directly) means it survives the setOrder/setShowReal renders
  // — otherwise React would rewrite className from props mid-cycle and the
  // CSS animation would abort, leaving the cast in a half-flickered state
  // (which manifested as "every other shuffle has no noise" / "one girl
  // disappears" because some image variants get displayed at an odd moment).
  useEffect(() => {
    const shuffleOrder = () => {
      setOrder((prev) => {
        const next = prev.slice();
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
      });
    };
    const shuffle = () => {
      shuffleOrder();
      if (Math.random() < 0.5) {
        setShowReal((v) => !v);
      }
    };

    const timers = [];
    const fireCycle = () => {
      // 1. Start the one-shot glitch (cast flicker + noise overlay).
      setGlitching(true);
      // 2. Commit the React swap mid-hide (40–80% of the 700ms keyframes
      //    = 280–560ms). 380ms lands solidly in the fully-hidden window.
      timers.push(setTimeout(shuffle, 380));
      // 3. End the one-shot animation so the class can be re-added next cycle.
      timers.push(setTimeout(() => setGlitching(false), 720));
    };

    // First glitch at 6s after mount; then every 6s.
    const initial = setTimeout(() => {
      fireCycle();
      const interval = setInterval(fireCycle, 6000);
      timers.push({ clear: () => clearInterval(interval) });
    }, 6000);

    return () => {
      clearTimeout(initial);
      timers.forEach((t) => {
        if (typeof t === "number") clearTimeout(t);
        else if (t && t.clear) t.clear();
      });
    };
  }, []);

  // Mouse parallax — logo + cast follow the pointer with different depths
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    let raf = 0,tx = 0,ty = 0,dx = 0,dy = 0;
    const apply = () => {
      tx += (dx - tx) * 0.08;
      ty += (dy - ty) * 0.08;
      root.style.setProperty("--mx", tx.toFixed(3));
      root.style.setProperty("--my", ty.toFixed(3));
      if (Math.abs(dx - tx) > 0.001 || Math.abs(dy - ty) > 0.001) {
        raf = requestAnimationFrame(apply);
      } else {raf = 0;}
    };
    // FV中心からの相対位置。±1 にクランプして「一定以上は傾かない」ようにする
    const clamp = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);
    const onMove = (e) => {
      const fv = root.closest(".fv") || root;
      const r = fv.getBoundingClientRect();
      dx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2);
      dy = clamp(((e.clientY - r.top) / r.height - 0.5) * 2);
      if (!raf) raf = requestAnimationFrame(apply);
    };
    // カーソルが画面外/ウィンドウ外へ出たら既定値（中立）へ戻す
    const onLeave = () => {dx = 0;dy = 0;if (!raf) raf = requestAnimationFrame(apply);};
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="fv" data-screen-label="01 First View" id="top">
      <FVDecor />
      <div className="fv-inner">

        <div className="fv-meta" style={{ fontWeight: "100", fontSize: "0px" }}>
          <span>{copy.fvMeta}</span>
          <span></span>
          <div className="right">
            <span>{copy.fvBadge}</span>
            <span style={{ color: "var(--pink)" }}></span>
          </div>
        </div>

        <div className="fv-headline">
          <div className="fv-tagline">
            <span className="fv-tagline-line">{copy.fvTagline}</span>
            <span className="fv-tagline-line">{copy.fvLine2}<em>{copy.fvLineEm}</em></span>
          </div>
          <div
            className={`fv-wordmark fv-wordmark-img${glitching ? " is-glitching" : ""}`}
            ref={heroRef}
          >
            <div className="fv-logo-band" aria-hidden="true">
              <div className="fv-logo-band-track">
                <img src="assets/logo-naughty-dark.png" alt="" />
              </div>
            </div>
            {/* (diagonal depth bars removed per request) */}
            <img className="fv-logo-img" src="assets/logo-naughty.png" alt="naughty" />
            <div
              className={`fv-cast-row${showReal ? " is-real" : ""}${glitching ? " is-glitching" : ""}`}
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4].map((i) =>
              <React.Fragment key={i}>
                <img
                  className={`fv-cast-girl fv-cast-girl-${i + 1} fv-cast-illus`}
                  src={`assets/cast/g${i + 1}.png`}
                  alt=""
                  style={{ "--slot": order.indexOf(i) }} />
                <img
                  className={`fv-cast-girl fv-cast-girl-${i + 1} fv-cast-real`}
                  src={`assets/cast/real-${i + 1}.png`}
                  alt=""
                  style={{ "--slot": order.indexOf(i) }} />
              </React.Fragment>
              )}
            </div>
          </div>
        </div>

        {/* Curtain on load */}
        {fvStyle === "curtain" &&
        <div className="fv-curtain" key={curtainKey} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} />)}
          </div>
        }

        <div className="scroll-cue" aria-hidden="true">
          <span></span>
          <div className="bar" style={{ height: "0px" }} />
        </div>

        {/* Replay button for curtain (dev nicety) */}
        {fvStyle === "curtain" &&
        <button
          type="button"
          onClick={replayCurtain}
          style={{
            position: "absolute", right: 24, bottom: 24,
            padding: "8px 12px", border: "1px solid var(--ink)",
            background: "var(--paper)", cursor: "pointer",
            fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: ".18em",
            textTransform: "uppercase"
          }}>

            ↻ Replay
          </button>
        }
      </div>

      {variant === "mobile" && false &&
      <div style={{ display: "grid", gap: 14, padding: "0 0 32px" }}>
          <WebcamPanel side="l" label="CAM 01 · LOUNGE" timecode="00:23:48" inline />
          <WebcamPanel side="r" label="CAM 02 · BAR" timecode="00:23:51" inline />
        </div>
      }
    </section>);

}

function WebcamPanel({ side, label, timecode, inline = false }) {
  return (
    <div className={`fv-cam ${side}`} style={inline ? { position: "relative", inset: "auto", transform: "rotate(-1.5deg)", width: "100%" } : null}>
      <div className="label">
        <span>{label}</span>
        <span className="rec">REC</span>
      </div>
      <div className="frame">
        <div className="silhouette">
          <img src="assets/icon-cat.png" alt="" />
        </div>
        <div className="scan" />
        <div className="glitch" />
        <div className="glitch" />
        <div className="glitch" />
      </div>
      <div className="time">
        <span>{timecode}</span>
        <span>TKY 35.6N · 139.6E</span>
      </div>
    </div>);

}

// ─── Marquee ────────────────────────────────────────
function Marquee({ text = "naughty", dark = false, items }) {
  const list = items || Array.from({ length: 10 }, (_, i) => i);
  return (
    <div className={`marquee ${dark ? "dark" : ""}`} aria-hidden="true">
      <div className="track">
        {list.concat(list).map((_, i) =>
        <span key={i}>
            {dark ? <em className="pk italic" style={{ fontStyle: "italic" }}>はじまる、いたずら。</em> : "naughty"}
            <span className="star">✦</span>
          </span>
        )}
      </div>
    </div>);

}

// ─── Jump Nav (replaces pink marquee) ───────────────────
function JumpNav({ variant }) {
  const suffix = variant === "mobile" ? "-m" : "";
  return (
    <nav className="jump-nav" aria-label="Jump to section">
      <a className="jump-pill" href={`#cast${suffix}`}>
        <span className="jp-text">CAST</span>
        <span className="jp-arrow" aria-hidden="true">→</span>
      </a>
      <a className="jump-pill" href={`#schedule${suffix}`}>
        <span className="jp-text">SCHEDULE</span>
        <span className="jp-arrow" aria-hidden="true">→</span>
      </a>
    </nav>);

}

// ─── Concept slideshow (cast photos auto-cycling) ────
function ConceptSlideshow() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % 5), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="cslide" aria-hidden="true">
      {[0,1,2,3,4].map((i) => (
        <img
          key={i}
          className={`cslide-img${idx === i ? " on" : ""}`}
          src={`assets/cast/cast-0${i+1}.png`}
          alt=""
        />
      ))}
      <div className="cslide-dots">
        {[0,1,2,3,4].map((i) => (
          <span key={i} className={`cslide-dot${idx === i ? " on" : ""}`} />
        ))}
      </div>
      <div className="cslide-meta">
        <span className="cslide-num">0{idx + 1} / 05</span>
        <span className="cslide-name">CAST · {["GIN","MOA","RIN","NANA","SAKI"][idx]}</span>
      </div>
    </div>
  );
}

// ─── Concept ────────────────────────────────────────
function Concept({ variant, copy }) {
  return (
    <section className="section" data-screen-label="02 Concept">
      <div className="section-head">
        <div className="num">02<em>.</em></div>
        <div className="titles">
          <div className="en">— Concept</div>
          <div className="jp">コンセプト</div>
        </div>
        <div className="nav-links">
          <a className="underline-link" href="#">About more</a>
        </div>
      </div>

      <div className="concept-grid">
        <div>
          <div className="concept-lead">
            {copy.conceptLead1}<em>{copy.conceptLeadEm}</em><br />
            {copy.conceptLead2.split("\n").map((l, i) => <div key={i} style={{ fontWeight: "100", fontSize: "0px" }}>{l}</div>)}
          </div>

          <div className="concept-body" style={{ marginTop: 32 }}>
            {copy.conceptBody.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          <div className="concept-bullets">
            {copy.conceptBullets.map((b, i) =>
            <div key={i} className="b">
                <div className="n">0{i + 1}</div>
                <div className="k">{b.k}</div>
                <div className="v">{b.v}</div>
              </div>
            )}
          </div>
        </div>

        <div className="concept-photo">
          <div className="mascot wobble" style={{ left: "-30px", top: "-40px", width: 100 }}>
            <img src="assets/icon-cat.png" alt="" />
          </div>
          <div className="ph concept-slideshow" style={{ width: "550px", height: "550px" }}>
            <ConceptSlideshow />
          </div>
          <div className="badge" style={{ fontSize: "25px", fontWeight: "400", textAlign: "left", color: "rgb(255, 255, 255)", width: "150px", height: "150px", lineHeight: "6" }}>
            {copy.conceptBadge[0]}
            <small style={{ fontSize: "0px" }}>{copy.conceptBadge[1]}</small>
          </div>
        </div>
      </div>
    </section>);

}

Object.assign(window, { Nav, FV, Marquee, JumpNav, Concept });

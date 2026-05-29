/* global React */
const { Fragment } = React;

// ============================================================
//  Shared mini components used across wireframe variants
// ============================================================

const Chrome = ({ url = "naughty.tokyo" }) => (
  <div className="wf-chrome">
    <span className="dot" /><span className="dot" /><span className="dot" />
    <span className="url">{url}</span>
  </div>
);

const Nav = ({ variant = "A" }) => (
  <div className="wf-nav">
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 22, height: 22, border: "1.4px solid var(--wf-ink)",
        display: "grid", placeItems: "center", fontFamily: "var(--wf-font-mono)",
        fontSize: 10, fontWeight: 700
      }}>N</div>
      <div className="logo">naughty<span style={{ color: "var(--wf-mute)" }}>.</span></div>
    </div>
    <div className="items">
      <span>Concept</span>
      <span>Cast</span>
      <span>Schedule</span>
      <span>News</span>
      <span>Access</span>
    </div>
    <div className="cta">Reserve →</div>
  </div>
);

const Footer = () => (
  <div className="wf-foot">
    <div>
      <h5>naughty</h5>
      <div className="wf-stack-lines"><div style={{ width: "70%" }} /><div style={{ width: "50%" }} /></div>
    </div>
    <div>
      <h5>Sitemap</h5>
      <div className="wf-stack-lines"><div /><div /><div /></div>
    </div>
    <div>
      <h5>Follow</h5>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="wf-box" style={{ width: 24, height: 24, borderRadius: 999 }} />
        <div className="wf-box" style={{ width: 24, height: 24, borderRadius: 999 }} />
        <div className="wf-box" style={{ width: 24, height: 24, borderRadius: 999 }} />
      </div>
    </div>
    <div>
      <h5>© 2026 naughty</h5>
      <div className="wf-label" style={{ marginTop: 6 }}>Privacy / Tokutei</div>
    </div>
  </div>
);

const SectionHead = ({ num, en, jp, hand }) => (
  <div className="wf-section-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
    <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
      <span className="wf-section-num">{num}</span>
      <span className="wf-label">— {en}</span>
    </div>
    <div className="wf-section-title">{jp}</div>
    {hand && <div className="wf-hand" style={{ marginTop: 4, opacity: .7 }}>{hand}</div>}
  </div>
);

// Annotation arrow + handwritten note
const Anno = ({ top, left, right, bottom, width, children, align = "left" }) => (
  <div className="wf-anno" style={{ top, left, right, bottom, width, textAlign: align }}>
    {children}
  </div>
);

// ============================================================
//  Variant A — Classic Editorial Vertical
//  Straightforward stacked sections. The safe baseline.
// ============================================================

function VariantA() {
  return (
    <div className="wf" style={{ display: "flex", flexDirection: "column" }}>
      <Chrome />
      <Nav />
      <div className="wf-scroll" style={{ overflow: "auto" }}>

        {/* FV */}
        <div className="wf-section" style={{ padding: "80px 56px 100px", minHeight: 620 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="wf-label">FV / Hero</div>
            <div className="wf-label">Scroll ↓</div>
          </div>
          <div style={{ display: "grid", placeItems: "center", margin: "100px 0 80px" }}>
            <div style={{
              fontFamily: "var(--wf-font-sans)", fontWeight: 800,
              fontSize: 120, letterSpacing: "-.02em", lineHeight: .9
            }}>
              naughty<span style={{ color: "var(--wf-mute)" }}>.</span>
            </div>
            <div className="wf-stack-lines" style={{ width: 320, marginTop: 28 }}>
              <div /><div />
            </div>
            <div className="wf-tag" style={{ marginTop: 28 }}>tagline / catch copy</div>
          </div>

          <Anno top={140} right={40} width={170} align="right">
            ↘ ロゴ大きく、<br/>余白で「圧」を作る
          </Anno>
          <Anno top={380} left={40} width={160}>
            ↗ 動的演出ゾーン<br/>(動画 / モーション)
          </Anno>

          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24 }}>
            <div className="wf-line-dark" style={{ width: 28, height: 2 }} />
            <div className="wf-line" style={{ width: 28, height: 2 }} />
            <div className="wf-line" style={{ width: 28, height: 2 }} />
          </div>
        </div>

        {/* CONCEPT */}
        <div className="wf-section">
          <SectionHead num="01" en="Concept" jp="コンセプト" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>
                深夜0時、画面の<br/>向こうから、<br/>はじまる、いたずら。
              </div>
              <div className="wf-stack-lines" style={{ marginTop: 24 }}>
                <div /><div /><div /><div /><div /><div />
              </div>
              <div className="wf-tag" style={{ marginTop: 22 }}>More about naughty →</div>
            </div>
            <div className="wf-img" style={{ height: 360 }} />
          </div>
        </div>

        {/* CAST */}
        <div className="wf-section">
          <SectionHead num="02" en="Cast" jp="キャストリスト" hand="3列グリッド × 段数自由" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="wf-img" style={{ height: 280 }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>CAST · NAME</div>
                  <div className="wf-label">#0{i+1}</div>
                </div>
                <div className="wf-stack-lines" style={{ marginTop: 6 }}><div /><div /></div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", placeItems: "center", marginTop: 32 }}>
            <div className="wf-tag" style={{ padding: "8px 18px" }}>View all cast →</div>
          </div>
        </div>

        {/* SCHEDULE */}
        <div className="wf-section">
          <SectionHead num="03" en="Schedule" jp="予定表" hand="週次カレンダー / キャスト紐付け" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="wf-tag">← prev week</div>
            <div className="wf-hand">W21 · May 18 — May 24</div>
            <div className="wf-tag">next week →</div>
          </div>
          <div className="wf-cal">
            <div className="wf-label" />
            {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d=>(
              <div key={d} className="wf-label" style={{ textAlign:"center" }}>{d}</div>
            ))}
            {Array.from({length:3}).map((_,row)=>(
              <Fragment key={row}>
                <div>20:00<br/>—<br/>26:00</div>
                {Array.from({length:7}).map((_,c)=>(
                  <div key={c} style={{ padding: 6 }}>
                    <div className="wf-box" style={{ height: 14, marginBottom: 4 }} />
                    <div className="wf-box" style={{ height: 14, width: "70%" }} />
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        {/* NEWS */}
        <div className="wf-section">
          <SectionHead num="04" en="News" jp="お知らせ" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "100px 110px 1fr 80px",
                gap: 18, padding: "16px 0", borderBottom: "1px solid var(--wf-line-2)",
                alignItems: "center"
              }}>
                <div className="wf-label">2026.05.{10-i}</div>
                <div className="wf-tag">EVENT</div>
                <div className="wf-stack-lines"><div style={{ width: `${80-i*8}%` }} /></div>
                <div className="wf-label">READ →</div>
              </div>
            ))}
          </div>
        </div>

        {/* ACCESS */}
        <div className="wf-section">
          <SectionHead num="05" en="Access" jp="店舗情報 / 予約" />
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 36 }}>
            <div className="wf-img no-tag" style={{ height: 320, position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0, display: "grid", placeItems: "center"
              }}>
                <div className="wf-tag">MAP</div>
              </div>
            </div>
            <div>
              <div className="wf-stack-lines"><div /><div /><div /><div /><div /></div>
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <div className="wf-tag solid" style={{ padding: "10px 18px" }}>RESERVE</div>
                <div className="wf-tag" style={{ padding: "10px 18px" }}>CALL</div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

window.VariantA = VariantA;

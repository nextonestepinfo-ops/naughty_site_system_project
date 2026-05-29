/* global React */

// ============================================================
//  Variant D — Framed / Numbered Card Stack
//  全セクションを「号外」「ポスター」的なフレームで包む。
//  各セクションに大ナンバー + コーナーラベル、終わりにマーキー。
// ============================================================

function VariantD() {
  const Chrome = () => (
    <div className="wf-chrome">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="url">naughty.tokyo</span>
    </div>
  );

  // Top utility bar (very thin)
  const UtilBar = () => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 24px", background: "var(--wf-ink)", color: "#fff",
      fontFamily: "var(--wf-font-mono)", fontSize: 10, letterSpacing: ".18em"
    }}>
      <span>NAUGHTY · CONCEPT CAFE TOKYO</span>
      <span>OPEN 20:00 — CLOSE 26:00 · TUE→SUN</span>
      <span>RESERVE →</span>
    </div>
  );

  const Nav = () => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 24px", borderBottom: "1.4px solid var(--wf-ink)"
    }}>
      <div style={{
        fontFamily: "var(--wf-font-sans)", fontWeight: 800,
        fontSize: 22, letterSpacing: ".02em"
      }}>
        naughty<span style={{ color: "var(--wf-mute)" }}>.</span>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {["Concept","Cast","Schedule","News","Access"].map(s=>(
          <span key={s} className="wf-label" style={{ color: "var(--wf-ink)" }}>{s}</span>
        ))}
      </div>
      <div className="wf-tag solid" style={{ padding: "6px 14px" }}>RESERVE</div>
    </div>
  );

  // Heavy bordered section with corner labels
  const Frame = ({ num, en, jp, children, dark = false, pad = 40 }) => (
    <div style={{ padding: "24px" }}>
      <div style={{
        border: "1.4px solid var(--wf-ink)",
        background: dark ? "var(--wf-ink)" : "var(--wf-paper)",
        color: dark ? "#fff" : "inherit",
        position: "relative",
        padding: pad
      }}>
        {/* Corner labels */}
        <div style={{
          position: "absolute", top: -10, left: 20,
          background: dark ? "var(--wf-ink)" : "var(--wf-paper)",
          padding: "0 8px",
          fontFamily: "var(--wf-font-mono)", fontSize: 10,
          letterSpacing: ".18em",
          color: dark ? "#fff" : "var(--wf-ink)"
        }}>
          [{num}] — {en}
        </div>
        <div style={{
          position: "absolute", top: -10, right: 20,
          background: dark ? "var(--wf-ink)" : "var(--wf-paper)",
          padding: "0 8px",
          fontFamily: "var(--wf-font-mono)", fontSize: 10,
          letterSpacing: ".18em",
          color: dark ? "rgba(255,255,255,.7)" : "var(--wf-ink-3)"
        }}>
          / FOR NAUGHTY · 2026
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "auto 1fr", gap: 32,
          alignItems: "flex-start"
        }}>
          <div style={{
            fontFamily: "var(--wf-font-sans)", fontWeight: 800,
            fontSize: 88, lineHeight: .9, letterSpacing: "-.03em",
            color: dark ? "#fff" : "var(--wf-ink)",
            paddingTop: 8
          }}>
            {num}
            <div style={{
              fontFamily: "var(--wf-font-mono)", fontSize: 10,
              letterSpacing: ".18em", fontWeight: 400,
              marginTop: 8,
              color: dark ? "rgba(255,255,255,.7)" : "var(--wf-ink-3)",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              display: "inline-block"
            }}>
              {jp}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>{children}</div>
        </div>
      </div>
    </div>
  );

  // Marquee strip
  const Marquee = ({ text = "NAUGHTY · NAUGHTY · NAUGHTY · NAUGHTY · NAUGHTY · NAUGHTY · ", dark = false }) => (
    <div style={{
      overflow: "hidden", whiteSpace: "nowrap",
      padding: "14px 0",
      background: dark ? "var(--wf-ink)" : "var(--wf-paper)",
      color: dark ? "#fff" : "var(--wf-ink)",
      borderTop: "1.4px solid var(--wf-ink)",
      borderBottom: "1.4px solid var(--wf-ink)",
      fontFamily: "var(--wf-font-sans)",
      fontWeight: 800, fontSize: 40, letterSpacing: ".04em"
    }}>
      {text}{text}
    </div>
  );

  return (
    <div className="wf" style={{ display: "flex", flexDirection: "column" }}>
      <Chrome />
      <UtilBar />
      <Nav />
      <div className="wf-scroll" style={{ overflow: "auto" }}>

        {/* FV — Massive type poster */}
        <div style={{ padding: "24px" }}>
          <div style={{
            border: "1.4px solid var(--wf-ink)",
            background: "var(--wf-ink)", color: "#fff",
            padding: "48px 40px", position: "relative",
            minHeight: 540
          }}>
            <div style={{
              position: "absolute", top: -10, left: 20,
              background: "var(--wf-ink)", padding: "0 8px",
              fontFamily: "var(--wf-font-mono)", fontSize: 10,
              letterSpacing: ".18em"
            }}>[ 00 ] — FIRST VIEW</div>
            <div style={{
              position: "absolute", top: -10, right: 20,
              background: "var(--wf-ink)", padding: "0 8px",
              fontFamily: "var(--wf-font-mono)", fontSize: 10,
              letterSpacing: ".18em", color: "rgba(255,255,255,.7)"
            }}>EST. 2026</div>

            <div className="wf-label" style={{ color: "rgba(255,255,255,.6)" }}>
              CONCEPT CAFE / NIGHT EDITION
            </div>

            <div style={{
              fontFamily: "var(--wf-font-sans)", fontWeight: 800,
              fontSize: 180, letterSpacing: "-.04em", lineHeight: .85,
              marginTop: 36
            }}>
              NAUGHTY<span style={{ color: "rgba(255,255,255,.4)" }}>.</span>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              alignItems: "end", marginTop: 48, gap: 32
            }}>
              <div className="wf-stack-lines" style={{ maxWidth: 380 }}>
                <div style={{ background: "rgba(255,255,255,.5)" }} />
                <div style={{ background: "rgba(255,255,255,.5)", width: "60%" }} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="wf-label" style={{ color: "rgba(255,255,255,.6)" }}>
                  SCROLL TO ENTER
                </div>
                <div style={{
                  marginTop: 6,
                  fontFamily: "var(--wf-font-sans)",
                  fontSize: 32, fontWeight: 800
                }}>↓</div>
              </div>
            </div>
          </div>
        </div>

        <Marquee text="—— はじまる、いたずら。 ——— NAUGHTY ——— OPEN 20:00 ——— " />

        {/* 01 — CONCEPT */}
        <Frame num="01" en="CONCEPT">
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.2 }}>
            深夜0時、画面の向こうから、<br/>
            <em style={{ fontStyle: "italic" }}>はじまる、いたずら。</em>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1.4fr 1fr",
            gap: 36, marginTop: 32
          }}>
            <div className="wf-stack-lines">
              <div /><div /><div /><div /><div /><div /><div />
            </div>
            <div className="wf-img" style={{ height: 220 }} />
          </div>
        </Frame>

        {/* 02 — CAST */}
        <Frame num="02" en="CAST">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 18
          }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>キャストリスト</div>
            <div className="wf-tag">VIEW ALL 12 →</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                border: "1.4px solid var(--wf-ink)", padding: 10
              }}>
                <div className="wf-img" style={{ height: 220 }} />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginTop: 10
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>NAME</div>
                    <div className="wf-label" style={{ marginTop: 2 }}>
                      {["GIN","KOI","RIN","MOE","NANA","SAKI"][i]} · 0{i+1}
                    </div>
                  </div>
                  <div className="wf-tag">→</div>
                </div>
              </div>
            ))}
          </div>
        </Frame>

        {/* 03 — SCHEDULE — チケット型 */}
        <Frame num="03" en="SCHEDULE">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 18
          }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>今週の予定</div>
            <div style={{ display:"flex", gap: 8 }}>
              <div className="wf-tag">← W20</div>
              <div className="wf-tag solid">W21</div>
              <div className="wf-tag">W22 →</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "MON 05.18","TUE 05.19","WED 05.20","THU 05.21","FRI 05.22","SAT 05.23","SUN 05.24"
            ].map((d, i) => (
              <div key={d} style={{
                border: "1.4px solid var(--wf-ink)",
                display: "grid", gridTemplateColumns: "140px 60px 1fr 100px",
                gap: 16, padding: "14px 18px", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d}</div>
                  <div className="wf-label" style={{ marginTop: 2 }}>20:00 — 26:00</div>
                </div>
                <div className="wf-tag" style={{ justifyContent: "center" }}>
                  {(["OPEN","OPEN","OPEN","OPEN","OPEN","EVENT","CLOSED"])[i]}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Array.from({ length: i === 6 ? 0 : 4 + (i%2) }).map((_, k) => (
                    <div key={k} className="wf-box-solid" style={{
                      width: 28, height: 28, borderRadius: 999
                    }} />
                  ))}
                </div>
                <div className="wf-label" style={{ textAlign: "right" }}>DETAIL →</div>
              </div>
            ))}
          </div>
        </Frame>

        {/* 04 — NEWS */}
        <Frame num="04" en="NEWS">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ border: "1.4px solid var(--wf-ink)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="wf-label">2026.05.0{8-i}</div>
                  <div className="wf-tag">{["EVENT","INFO","NEWS"][i]}</div>
                </div>
                <div className="wf-img" style={{ height: 110, marginTop: 12 }} />
                <div className="wf-stack-lines" style={{ marginTop: 12 }}>
                  <div /><div style={{ width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        </Frame>

        {/* 05 — ACCESS */}
        <Frame num="05" en="ACCESS" dark>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div className="wf-img no-tag" style={{
              height: 280, position: "relative",
              borderColor: "rgba(255,255,255,.6)",
              background:
                "linear-gradient(135deg, transparent 49.3%, rgba(255,255,255,.3) 49.3%, rgba(255,255,255,.3) 50.7%, transparent 50.7%)," +
                "linear-gradient(45deg, transparent 49.3%, rgba(255,255,255,.3) 49.3%, rgba(255,255,255,.3) 50.7%, transparent 50.7%)"
            }}>
              <div style={{
                position: "absolute", inset: 0, display: "grid", placeItems: "center"
              }}>
                <div className="wf-tag" style={{ background: "transparent", color: "#fff", borderColor: "#fff" }}>
                  MAP
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>
                naughty 東京・○○<br/>
                <span style={{ color: "rgba(255,255,255,.6)", fontWeight: 400, fontSize: 16 }}>
                  〒000-0000 / 駅徒歩 ○分
                </span>
              </div>
              <div className="wf-stack-lines" style={{ marginTop: 20 }}>
                <div style={{ background: "rgba(255,255,255,.5)" }} />
                <div style={{ background: "rgba(255,255,255,.5)" }} />
                <div style={{ background: "rgba(255,255,255,.5)", width: "70%" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <div style={{
                  border: "1.4px solid #fff", padding: "10px 18px",
                  fontFamily: "var(--wf-font-mono)", fontSize: 10,
                  letterSpacing: ".18em"
                }}>RESERVE →</div>
                <div style={{
                  border: "1.4px solid rgba(255,255,255,.5)", padding: "10px 18px",
                  fontFamily: "var(--wf-font-mono)", fontSize: 10,
                  letterSpacing: ".18em",
                  color: "rgba(255,255,255,.8)"
                }}>LINE / CALL</div>
              </div>
            </div>
          </div>
        </Frame>

        <Marquee text="——— はじめる、いたずら。 ——— RESERVE ——— OPEN 20:00 ——— " dark />

        {/* Footer */}
        <div style={{ padding: "32px 24px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 24, alignItems: "start" }}>
            <div>
              <div style={{ fontFamily: "var(--wf-font-sans)", fontWeight: 800, fontSize: 32 }}>
                naughty<span style={{ color: "var(--wf-mute)" }}>.</span>
              </div>
              <div className="wf-label" style={{ marginTop: 6 }}>
                CONCEPT CAFE / EST. 2026
              </div>
            </div>
            <div>
              <h5 style={{ fontFamily: "var(--wf-font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--wf-ink-3)", margin: "0 0 10px" }}>SITE</h5>
              <div className="wf-stack-lines"><div/><div/><div/></div>
            </div>
            <div>
              <h5 style={{ fontFamily: "var(--wf-font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--wf-ink-3)", margin: "0 0 10px" }}>FOLLOW</h5>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="wf-box" style={{ width: 24, height: 24, borderRadius: 999 }}/>
                <div className="wf-box" style={{ width: 24, height: 24, borderRadius: 999 }}/>
                <div className="wf-box" style={{ width: 24, height: 24, borderRadius: 999 }}/>
              </div>
            </div>
            <div>
              <h5 style={{ fontFamily: "var(--wf-font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--wf-ink-3)", margin: "0 0 10px" }}>© 2026</h5>
              <div className="wf-label">Privacy / Tokutei</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

window.VariantD = VariantD;

/* global React */

// ============================================================
//  Variant C — Index / Sticky Sidebar Navigation
//  vspo / aogiri 系のセクションインデックス型。
//  左に固定インデックス、右に大きなナンバリングと余白多めの章立て。
// ============================================================

function VariantC() {
  const InlineChrome = () => (
    <div className="wf-chrome">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="url">naughty.tokyo</span>
    </div>
  );

  const sections = [
    { num: "01", en: "First View", jp: "FV" },
    { num: "02", en: "Concept", jp: "コンセプト" },
    { num: "03", en: "Cast", jp: "キャストリスト" },
    { num: "04", en: "Schedule", jp: "予定表" },
    { num: "05", en: "News", jp: "お知らせ" },
    { num: "06", en: "Access", jp: "店舗情報" },
  ];

  const Sidebar = () => (
    <div style={{
      position: "sticky", top: 0,
      width: 220, padding: "32px 24px 32px 40px",
      borderRight: "1px solid var(--wf-line-2)",
      flex: "0 0 220px",
      alignSelf: "flex-start",
      minHeight: "100%"
    }}>
      <div style={{ fontFamily: "var(--wf-font-sans)", fontWeight: 800, fontSize: 18, letterSpacing: ".02em" }}>
        naughty<span style={{ color: "var(--wf-mute)" }}>.</span>
      </div>
      <div className="wf-label" style={{ marginTop: 6 }}>concept cafe</div>

      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((s, i) => (
          <div key={s.num} style={{
            display: "grid", gridTemplateColumns: "28px 1fr",
            alignItems: "center", gap: 8
          }}>
            <span className="wf-label" style={{ opacity: i === 0 ? 1 : .55 }}>{s.num}</span>
            <span style={{
              fontFamily: "var(--wf-font-mono)", fontSize: 11,
              letterSpacing: ".12em", textTransform: "uppercase",
              color: i === 0 ? "var(--wf-ink)" : "var(--wf-ink-3)",
              fontWeight: i === 0 ? 700 : 400
            }}>
              {s.en}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 36, padding: "12px 14px",
        border: "1.4px solid var(--wf-ink)",
        textAlign: "center"
      }}>
        <div className="wf-label" style={{ color: "var(--wf-ink)" }}>RESERVE →</div>
      </div>

      <div style={{ position: "absolute", bottom: 32, left: 40, right: 24 }}>
        <div className="wf-label">FOLLOW</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div className="wf-box" style={{ width: 22, height: 22, borderRadius: 999 }} />
          <div className="wf-box" style={{ width: 22, height: 22, borderRadius: 999 }} />
          <div className="wf-box" style={{ width: 22, height: 22, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );

  const Chapter = ({ num, en, jp, children, dark = false }) => (
    <div style={{
      position: "relative",
      padding: "80px 56px",
      borderBottom: "1px solid var(--wf-line-2)",
      background: dark ? "var(--wf-ink)" : "transparent",
      color: dark ? "#fff" : "inherit"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 32 }}>
        <div>
          <div style={{
            fontFamily: "var(--wf-font-sans)", fontWeight: 800,
            fontSize: 64, lineHeight: 1, letterSpacing: "-.02em",
            color: dark ? "#fff" : "var(--wf-ink)", opacity: dark ? 1 : .85
          }}>
            {num}
          </div>
          <div className="wf-label" style={{
            marginTop: 10,
            color: dark ? "rgba(255,255,255,.55)" : "var(--wf-ink-3)"
          }}>
            — {en}
          </div>
          <div style={{
            marginTop: 4, fontWeight: 700, fontSize: 14
          }}>{jp}</div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );

  return (
    <div className="wf" style={{ display: "flex", flexDirection: "column" }}>
      <InlineChrome />
      <div className="wf-scroll" style={{ overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", minHeight: "100%" }}>
          <Sidebar />
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* 01 — FV */}
            <Chapter num="01" en="First View" jp="ファーストビュー" dark>
              <div style={{ minHeight: 480, position: "relative", padding: "20px 0" }}>
                <div style={{
                  fontFamily: "var(--wf-font-sans)", fontWeight: 800,
                  fontSize: 140, letterSpacing: "-.03em", lineHeight: .85,
                  color: "#fff"
                }}>
                  NAUGHTY<span style={{ color: "rgba(255,255,255,.4)" }}>.</span>
                </div>
                <div style={{ marginTop: 32, maxWidth: 360 }}>
                  <div className="wf-stack-lines">
                    <div style={{ background: "rgba(255,255,255,.4)" }} />
                    <div style={{ background: "rgba(255,255,255,.4)", width: "70%" }} />
                  </div>
                </div>
                <div style={{
                  position: "absolute", right: 0, top: 20,
                  width: 220, height: 320,
                  border: "1.4px solid rgba(255,255,255,.5)",
                  background:
                    "linear-gradient(135deg, transparent 49.3%, rgba(255,255,255,.3) 49.3%, rgba(255,255,255,.3) 50.7%, transparent 50.7%)," +
                    "linear-gradient(45deg, transparent 49.3%, rgba(255,255,255,.3) 49.3%, rgba(255,255,255,.3) 50.7%, transparent 50.7%)",
                }} />
                <div style={{
                  position: "absolute", bottom: 20, left: 0,
                  display: "flex", gap: 14, alignItems: "center"
                }}>
                  <div style={{ width: 60, height: 1, background: "#fff" }} />
                  <div style={{
                    fontFamily: "var(--wf-font-mono)", fontSize: 10,
                    letterSpacing: ".18em", color: "rgba(255,255,255,.7)"
                  }}>SCROLL ↓</div>
                </div>
              </div>
            </Chapter>

            {/* 02 — Concept */}
            <Chapter num="02" en="Concept" jp="コンセプト">
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.3, maxWidth: 720 }}>
                深夜0時、画面の向こうから、<br/>
                <em style={{ fontStyle: "italic" }}>はじまる、いたずら。</em>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, marginTop: 36 }}>
                <div className="wf-stack-lines">
                  <div /><div /><div /><div /><div /><div />
                </div>
                <div className="wf-img" style={{ height: 220 }} />
              </div>
            </Chapter>

            {/* 03 — Cast */}
            <Chapter num="03" en="Cast" jp="キャストリスト">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <div className="wf-img" style={{ height: 200 }} />
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginTop: 8, fontSize: 11
                    }}>
                      <span style={{ fontWeight: 600 }}>NAME</span>
                      <span className="wf-label">0{i+1}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                <div className="wf-tag">View all 12 →</div>
              </div>
            </Chapter>

            {/* 04 — Schedule */}
            <Chapter num="04" en="Schedule" jp="予定表">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 14
              }}>
                <div className="wf-hand">W21 / May 18 — 24</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div className="wf-tag">←</div><div className="wf-tag">→</div>
                </div>
              </div>
              <div className="wf-cal">
                <div className="wf-label" />
                {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d=>(
                  <div key={d} className="wf-label" style={{ textAlign:"center" }}>{d}</div>
                ))}
                {Array.from({length:2}).map((_,row)=>(
                  <React.Fragment key={row}>
                    <div>EVE</div>
                    {Array.from({length:7}).map((_,c)=>(
                      <div key={c}>
                        <div className="wf-box" style={{ height: 12, marginBottom: 4 }} />
                        <div className="wf-box" style={{ height: 12, width: "60%" }} />
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </Chapter>

            {/* 05 — News */}
            <Chapter num="05" en="News" jp="お知らせ">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "100px 100px 1fr 60px",
                  gap: 16, padding: "14px 0",
                  borderBottom: "1px solid var(--wf-line-2)",
                  alignItems: "center"
                }}>
                  <div className="wf-label">2026.05.0{9-i}</div>
                  <div className="wf-tag">{["EVENT","INFO","NEWS"][i]}</div>
                  <div className="wf-stack-lines"><div style={{ width: `${85-i*8}%` }} /></div>
                  <div className="wf-label" style={{ textAlign: "right" }}>→</div>
                </div>
              ))}
            </Chapter>

            {/* 06 — Access */}
            <Chapter num="06" en="Access" jp="店舗情報 / 予約">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                <div className="wf-img no-tag" style={{ height: 260, position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                    <div className="wf-tag">MAP</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>naughty 東京・○○</div>
                  <div className="wf-stack-lines" style={{ marginTop: 14 }}>
                    <div /><div /><div /><div />
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                    <div className="wf-tag solid" style={{ padding: "8px 16px" }}>RESERVE</div>
                    <div className="wf-tag" style={{ padding: "8px 16px" }}>LINE</div>
                  </div>
                </div>
              </div>
            </Chapter>

            <div className="wf-foot" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              <div><h5>naughty</h5><div className="wf-stack-lines"><div style={{width:"70%"}}/><div style={{width:"50%"}}/></div></div>
              <div><h5>Sitemap</h5><div className="wf-stack-lines"><div/><div/><div/></div></div>
              <div><h5>Follow</h5><div style={{display:"flex",gap:8}}><div className="wf-box" style={{width:24,height:24,borderRadius:999}}/><div className="wf-box" style={{width:24,height:24,borderRadius:999}}/><div className="wf-box" style={{width:24,height:24,borderRadius:999}}/></div></div>
              <div><h5>© 2026 naughty</h5><div className="wf-label" style={{marginTop:6}}>Privacy / Tokutei</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.VariantC = VariantC;

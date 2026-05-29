/* global React */

// ============================================================
//  Variant B — Asymmetric Magazine / Editorial Offset
//  B案 (MONO EDITORIAL) を意識:極小ピンク差し色は抜き、
//  雑誌的余白+オフセット型タイポで「コンセプトの濃度」を表現
// ============================================================

function VariantB() {
  const Chrome = window.Chrome || (() => null);
  const Nav = ({}) => (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center", padding: "22px 40px",
      borderBottom: "1px solid var(--wf-line-2)"
    }}>
      <div className="wf-label">VOL. 01 / 2026</div>
      <div style={{
        fontFamily: "var(--wf-font-sans)", fontWeight: 800,
        fontSize: 22, letterSpacing: ".02em"
      }}>naughty<span style={{ color: "var(--wf-mute)" }}>.</span></div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap: 18 }}>
        <span className="wf-label">MENU</span>
        <span className="wf-label">EN / JP</span>
      </div>
    </div>
  );

  // Inline browser chrome
  const InlineChrome = () => (
    <div className="wf-chrome">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="url">naughty.tokyo</span>
    </div>
  );

  return (
    <div className="wf" style={{ display: "flex", flexDirection: "column" }}>
      <InlineChrome />
      <Nav />
      <div className="wf-scroll" style={{ overflow: "auto" }}>

        {/* FV — タイポ左寄せ + 画像右オフセット */}
        <div className="wf-section" style={{ padding: "60px 0 80px", borderBottom: "1px solid var(--wf-line-2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, position: "relative" }}>
            <div style={{ padding: "20px 0 0 56px" }}>
              <div className="wf-label" style={{ marginBottom: 18 }}>— ISSUE 01 / FIRST VIEW</div>
              <div style={{
                fontFamily: "var(--wf-font-sans)", fontWeight: 800,
                fontSize: 110, letterSpacing: "-.02em", lineHeight: .92
              }}>
                naughty<span style={{ color: "var(--wf-mute)" }}>.</span>
              </div>
              <div className="wf-hand" style={{ fontSize: 22, marginTop: 18 }}>
                — Concept Cafe, Tokyo
              </div>
              <div className="wf-stack-lines" style={{ marginTop: 36, maxWidth: 280 }}>
                <div /><div /><div />
              </div>
              <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
                <div className="wf-tag solid" style={{ padding: "8px 16px" }}>↓ Scroll</div>
                <div className="wf-tag" style={{ padding: "8px 16px" }}>About</div>
              </div>
            </div>
            <div className="wf-img" style={{
              height: 480, marginRight: 0,
              position: "relative", left: 40, top: 30
            }} />
          </div>

          <Anno top={460} left={56} width={180}>
            ↑ FVは見出しと画像を<br/>あえて高さ違いに配置
          </Anno>
        </div>

        {/* CONCEPT — 横長一行の見出し + ロングテキスト2カラム */}
        <div className="wf-section" style={{ padding: "72px 56px" }}>
          <div className="wf-label" style={{ marginBottom: 12 }}>— 01 / CONCEPT</div>
          <div style={{
            fontSize: 56, fontWeight: 700, letterSpacing: "-.01em",
            lineHeight: 1.05, maxWidth: "92%"
          }}>
            <em style={{ fontStyle: "italic", fontWeight: 700 }}>はじまる、</em>
            いたずら。<br/>
            <span style={{ color: "var(--wf-mute)" }}>—— for the night side of Tokyo.</span>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 36, marginTop: 56
          }}>
            <div>
              <div className="wf-label">— 01.1 What</div>
              <div className="wf-stack-lines" style={{ marginTop: 14 }}>
                <div /><div /><div /><div /><div />
              </div>
            </div>
            <div>
              <div className="wf-label">— 01.2 Who</div>
              <div className="wf-stack-lines" style={{ marginTop: 14 }}>
                <div /><div /><div /><div />
              </div>
            </div>
            <div className="wf-img" style={{ height: 200 }} />
          </div>
        </div>

        {/* CAST — 1人を超大判 + 横スクロールの小サムネ */}
        <div className="wf-section" style={{ padding: "0 0 72px", borderBottom: "1px solid var(--wf-line-2)" }}>
          <div style={{ padding: "60px 56px 24px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="wf-label" style={{ marginBottom: 8 }}>— 02 / CAST</div>
              <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-.01em" }}>キャスト一覧</div>
            </div>
            <div className="wf-tag">View all 12 →</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0 }}>
            {/* Featured */}
            <div style={{ paddingLeft: 56, position: "relative" }}>
              <div className="wf-img" style={{ height: 520 }} />
              <div style={{
                position: "absolute", left: 30, bottom: -10,
                background: "var(--wf-paper)", padding: "10px 16px",
                border: "1.4px solid var(--wf-ink)"
              }}>
                <div className="wf-label">CAST · 01 / FEATURED</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>NAME ──── ──</div>
              </div>
            </div>

            {/* Right column — list of small */}
            <div style={{ padding: "0 56px 0 48px", display: "flex", flexDirection: "column", gap: 14 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr auto",
                  gap: 16, alignItems: "center",
                  borderBottom: "1px solid var(--wf-line-2)", paddingBottom: 14
                }}>
                  <div className="wf-img" style={{ height: 100 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>CAST · 0{i+2}</div>
                    <div className="wf-stack-lines" style={{ marginTop: 6 }}>
                      <div /><div style={{ width: "60%" }} />
                    </div>
                  </div>
                  <div className="wf-label">→</div>
                </div>
              ))}
            </div>
          </div>

          <Anno top={140} right={56} width={170} align="right">
            雑誌の特集のように<br/>1人を主役で見せる ↘
          </Anno>
        </div>

        {/* SCHEDULE — リスト型 (テーブル) */}
        <div className="wf-section" style={{ padding: "72px 56px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <div>
              <div className="wf-label" style={{ marginBottom: 6 }}>— 03 / SCHEDULE</div>
              <div style={{ fontSize: 42, fontWeight: 700 }}>今週の予定表</div>
            </div>
            <div style={{ display:"flex", gap: 8 }}>
              <div className="wf-tag">Weekly</div>
              <div className="wf-tag solid">Monthly</div>
            </div>
          </div>

          <div style={{ borderTop: "1.4px solid var(--wf-ink)" }}>
            {["MON 05.18","TUE 05.19","WED 05.20","THU 05.21","FRI 05.22","SAT 05.23","SUN 05.24"].map((d,i)=>(
              <div key={d} style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 200px",
                gap: 20, padding: "18px 0",
                borderBottom: "1px solid var(--wf-line-2)",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d}</div>
                  <div className="wf-label" style={{ marginTop: 4 }}>20:00 — 26:00</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {Array.from({length: 3 + (i%2)}).map((_,k)=>(
                    <div key={k} className="wf-box-solid" style={{
                      width: 36, height: 36, borderRadius: 999
                    }} />
                  ))}
                  <div className="wf-label" style={{ alignSelf: "center", marginLeft: 6 }}>
                    +{3+(i%2)} cast
                  </div>
                </div>
                <div style={{ textAlign: "right" }} className="wf-label">DETAIL →</div>
              </div>
            ))}
          </div>
        </div>

        {/* NEWS + ACCESS — 2カラム */}
        <div className="wf-section" style={{ padding: "72px 56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
            <div>
              <div className="wf-label" style={{ marginBottom: 6 }}>— 04 / NEWS</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 18 }}>お知らせ</div>
              {Array.from({length: 3}).map((_,i)=>(
                <div key={i} style={{
                  padding: "14px 0", borderBottom: "1px solid var(--wf-line-2)"
                }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                    <div className="wf-label">2026.05.0{8-i}</div>
                    <div className="wf-tag">EVENT</div>
                  </div>
                  <div className="wf-stack-lines"><div style={{ width: `${85-i*10}%` }} /></div>
                </div>
              ))}
            </div>
            <div>
              <div className="wf-label" style={{ marginBottom: 6 }}>— 05 / ACCESS</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 18 }}>店舗情報</div>
              <div className="wf-img no-tag" style={{ height: 220, position: "relative" }}>
                <div style={{
                  position: "absolute", inset: 0, display: "grid", placeItems: "center"
                }}><div className="wf-tag">MAP</div></div>
              </div>
              <div className="wf-stack-lines" style={{ marginTop: 16 }}>
                <div /><div /><div />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <div className="wf-tag solid" style={{ padding: "8px 16px" }}>RESERVE</div>
                <div className="wf-tag" style={{ padding: "8px 16px" }}>CALL / LINE</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Strip */}
        <div style={{
          padding: "60px 56px",
          background: "var(--wf-ink)", color: "#fff"
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.01em" }}>
              いたずらを、はじめる。
            </div>
            <div style={{
              border:"1.4px solid #fff", padding:"12px 22px",
              fontFamily: "var(--wf-font-mono)", fontSize: 11,
              letterSpacing: ".18em"
            }}>RESERVE NOW →</div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// shared mini components defined in variant-a.jsx via window
const Anno = ({ top, left, right, bottom, width, children, align = "left" }) => (
  <div className="wf-anno" style={{ top, left, right, bottom, width, textAlign: align }}>
    {children}
  </div>
);
const Footer = () => (
  <div className="wf-foot">
    <div><h5>naughty</h5><div className="wf-stack-lines"><div style={{width:"70%"}}/><div style={{width:"50%"}}/></div></div>
    <div><h5>Sitemap</h5><div className="wf-stack-lines"><div/><div/><div/></div></div>
    <div><h5>Follow</h5><div style={{display:"flex",gap:8}}><div className="wf-box" style={{width:24,height:24,borderRadius:999}}/><div className="wf-box" style={{width:24,height:24,borderRadius:999}}/><div className="wf-box" style={{width:24,height:24,borderRadius:999}}/></div></div>
    <div><h5>© 2026 naughty</h5><div className="wf-label" style={{marginTop:6}}>Privacy / Tokutei</div></div>
  </div>
);

window.VariantB = VariantB;

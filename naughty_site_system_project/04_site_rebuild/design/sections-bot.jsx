/* global React */
// =====================================================
// naughty — News, Access, CTA strip, Footer
// =====================================================

function News({ variant, copy }) {
  return (
    <section className="section" data-screen-label="05 News">
      <div className="section-head">
        <div className="num">05<em>.</em></div>
        <div className="titles">
          <div className="en">— News / Information</div>
          <div className="jp">お知らせ</div>
        </div>
        <div className="nav-links">
          <a className="underline-link" href="#">All news →</a>
        </div>
      </div>

      <div className="news-grid">
        {copy.newsItems.map((n, i) =>
        <a key={i} className="news-row" href="#">
            <div className="date">{n.date}</div>
            <div className={`pin ${n.event ? "event" : ""}`}>{n.pin}</div>
            <div className="ttl">{n.t}</div>
            <div className="arrow">→</div>
          </a>
        )}
      </div>
    </section>);

}

function Access({ variant }) {
  return (
    <section className="section" data-screen-label="06 Access">
      <div className="section-head">
        <div className="num">06<em>.</em></div>
        <div className="titles">
          <div className="en">— Access / Reserve</div>
          <div className="jp">店舗情報 / ご予約</div>
        </div>
        <div className="nav-links">
          <a className="underline-link" href="#">Google Maps →</a>
        </div>
      </div>

      <div className="access-grid">
        <div className="access-map">
          <div className="grid-bg" />
          <div className="road h1" />
          <div className="road v1" />
          <div className="pin">
            <div className="dot" />
            <div className="lbl">naughty</div>
          </div>
          <div className="meta">
            <span className="tag" style={{ background: "var(--paper)", padding: "4px 8px" }}>MAP</span>
            <span className="tag ghost" style={{ padding: "4px 8px" }}>1:5000</span>
          </div>
        </div>

        <div className="access-info">
          <div className="mono" style={{ marginBottom: 8, color: "var(--ink-3)" }}>— Store information</div>
          <h3>naughty </h3>
          <div className="sub">BAR &amp; CONCEPT CAFE</div>

          <dl>
            <dt>Address</dt>
            <dd>
              〒000-0000<br />
              東京都○○区○○ 1-2-3 ○○ビル B1
            </dd>

            <dt>Access</dt>
            <dd>
              ○○線 ○○駅 <b>徒歩3分</b> / ○○線 ○○駅 徒歩6分
            </dd>

            <dt>Hours</dt>
            <dd>
              <b>20:00 — 26:00</b>(L.O. 25:30)<br />
              定休日 / 月曜
            </dd>

            <dt>Contact</dt>
            <dd>
              03-0000-0000 / LINE @naughty.tokyo
            </dd>
          </dl>

          <div className="access-actions">
            <a className="cta pink" href="#">RESERVE NOW <span>→</span></a>
            <a className="cta ghost" href="#">LINE で予約</a>
            <a className="cta ghost" href="#">電話</a>
          </div>
        </div>
      </div>
    </section>);

}

function CTAStrip({ copy }) {
  return (
    <section className="cta-strip" data-screen-label="07 CTA">
      <div className="cta-strip-inner">
        <h2>
          {copy.ctaH2Line1}<em>{copy.ctaH2Em}</em>{copy.ctaH2Line2}
          <br />
          <span style={{
            fontFamily: "var(--f-italic)", fontStyle: "italic",
            fontWeight: 400, fontSize: ".55em", color: "var(--mute)", letterSpacing: 0
          }}>

          </span>
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="cta" href="#">RESERVE <span>→</span></a>
          <a className="cta ghost" href="#" style={{ color: "var(--paper)", borderColor: "rgba(255,255,255,.4)" }}>LINE / TEL</a>
        </div>
      </div>
      <div className="ribbon">
        {Array.from({ length: 8 }).map((_, i) =>
        <span key={i}>NAUGHTY · NAUGHTY · NAUGHTY · </span>
        )}
      </div>
    </section>);

}

function Footer({ variant }) {
  return (
    <footer className="foot" data-screen-label="08 Footer">
      <div className="foot-grid">
        <div className="foot-brand">
          <div className="logo" style={{ marginBottom: 6 }}>
            <img src="assets/logo-naughty-dark.png" alt="naughty" style={{ width: 280, height: "auto", display: "block" }} />
          </div>
          <div className="tag-jp">

</div>
          <div className="socials" style={{ marginTop: 20 }}>
            <a href="#" aria-label="Instagram"><img src="assets/icon-instagram.png" alt="" /></a>
            <a href="#" aria-label="TikTok"><img src="assets/icon-tiktok.png" alt="" /></a>
            <a href="#" aria-label="Mail"><img src="assets/icon-mail.png" alt="" /></a>
            <a href="#" aria-label="Speak"><img src="assets/icon-bubble.png" alt="" /></a>
          </div>
        </div>
        <div>
          <h5>Sitemap</h5>
          <ul>
            <li><a href="#">Concept</a></li>
            <li><a href="#">Cast</a></li>
            <li><a href="#">Schedule</a></li>
            <li><a href="#">News</a></li>
            <li><a href="#">Access</a></li>
          </ul>
        </div>
        <div>
          <h5>Information</h5>
          <ul>
            <li><a href="#">予約方法について</a></li>
            <li><a href="#">よくある質問</a></li>
            <li><a href="#">店舗ルール</a></li>
            <li><a href="#">採用情報</a></li>
            <li><a href="#">お問い合わせ</a></li>
          </ul>
        </div>
        <div>
          <h5>Newsletter</h5>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.7 }}>
            月1回、お店のお知らせと、こっそりイベント情報を。
          </p>
          <form style={{ display: "flex", marginTop: 14, border: "1px solid var(--ink)"
          }} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="you@example.com"
              style={{
                flex: 1, border: 0, padding: "10px 12px",
                fontFamily: "var(--f-mono)", fontSize: 11,
                background: "transparent", outline: "none"
              }} />
            
            <button type="submit" style={{
              background: "var(--ink)", color: "var(--paper)",
              border: 0, padding: "10px 14px",
              fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: ".2em",
              textTransform: "uppercase", cursor: "pointer"
            }}>
              JOIN →
            </button>
          </form>
        </div>
      </div>

      <div className="foot-bottom">
        <div className="copy">© 2026 naughty / All Rights Reserved.</div>
        <div className="legal">
          <a href="#">Privacy</a>
          <a href="#">特定商取引法</a>
          <a href="#">利用規約</a>
        </div>
      </div>
    </footer>);

}

Object.assign(window, { News, Access, CTAStrip, Footer });
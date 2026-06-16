/* global React */
// =====================================================
// NAUGHTY — site sections (production-21 準拠の内容)
//   黒土ダークデザインの語彙で再構成
// =====================================================
const { useState } = React;

// smooth-scroll to a section + fire the background gimmick
function goTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 78;
  window.scrollTo({ top: y, behavior: "smooth" });
  if (window.triggerPatternShift) window.triggerPatternShift(id);
}

// ── Reusable section header ───────────────────────────
function Head({ num, en, jp, link }) {
  return (
    <div className="section-head">
      <div className="num">{num}<em>.</em></div>
      <div className="titles">
        <div className="en">— {en}</div>
        <div className="jp">{jp}</div>
      </div>
      {link ? (
        <div className="nav-links">
          <a className="underline-link" href={link.href} onClick={link.onClick}>{link.label}</a>
        </div>
      ) : <div className="nav-links" />}
    </div>
  );
}

function Monogram({ c, className }) {
  return (
    <div className={`mono-ph ${className || ""}`}>
      <span className="mono-letter">{c.en[0]}</span>
      <span className="mono-motif">{c.motif}</span>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────
function Nav2() {
  const links = window.NTY.sections.filter((s) => s.id !== "top");
  const menuLinks = links.filter((s) => s.id !== "recruit");
  const [open, setOpen] = useState(false);
  const jump = (id) => { setOpen(false); goTo(id); };
  return (
    <header className={`nav site-nav ${open ? "is-open" : ""}`}>
      <div className="left">
        <span className="dot" />
        <span>OPEN {window.NTY.venue.open}</span>
        <span className="hide-sm">/ {window.NTY.venue.areaJp}</span>
      </div>
      <a className="logo" href="#top" onClick={(e) => { e.preventDefault(); jump("top"); }}>
        <img src="assets/logo-naughty-dark.png" alt="NAUGHTY" />
      </a>
      <div className="right">
        <nav className="site-menu">
          {menuLinks.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); jump(s.id); }}>{s.en}</a>
          ))}
        </nav>
        <a className="cta pink recruit-btn" href="#recruit" onClick={(e) => { e.preventDefault(); jump("recruit"); }}>
          RECRUIT <span>→</span>
        </a>
        <button className="nav-burger" aria-label="メニュー" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span></span><span></span><span></span>
        </button>
      </div>

      {/* mobile drawer */}
      <div className="nav-drawer" onClick={() => setOpen(false)}>
        <nav className="nd-menu" onClick={(e) => e.stopPropagation()}>
          {links.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); jump(s.id); }}>
              <span className="nd-num">{s.num}</span>
              <span className="nd-en">{s.en}</span>
              <span className="nd-jp">{s.jp}</span>
            </a>
          ))}
          <div className="nd-foot">OPEN {window.NTY.venue.open} · {window.NTY.venue.areaJp}</div>
        </nav>
      </div>
    </header>
  );
}

// ── Mobile hero cast — 2〜3人の組み合わせを大きく回す ──
//   スマホで5人横並びだと小さくなるので、参考(ぶいすぽ)のように
//   2〜3人を大きく全面に出し、組み合わせをフェードで切り替える。
function MobileHeroCast() {
  // g1–g5 の組み合わせ（2〜3人）を順番に回す
  const combos = [
    [0, 2, 4],
    [1, 3],
    [2, 1, 3],
    [0, 4],
    [3, 2, 0],
  ];
  const [ci, setCi] = useState(0);
  const [glitch, setGlitch] = useState(false);
  React.useEffect(() => {
    const t = setInterval(() => {
      setGlitch(true);
      setCi((c) => (c + 1) % combos.length);
      setTimeout(() => setGlitch(false), 680);
    }, 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`fv-mcast${glitch ? " is-glitching" : ""}`} aria-hidden="true">
      {combos.map((combo, idx) => (
        <div className={`mc-group n${combo.length} ${idx === ci ? "on" : ""}`} key={idx}>
          {combo.map((g, pos) => (
            <img key={g} className={`mc-fig pos-${pos}`}
              src={`assets/cast/g${g + 1}.png`} alt="" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── TODAY ─────────────────────────────────────────────
const TODAY_LABEL = { now: "出勤中", soon: "まもなく", today: "本日出勤" };
function Today() {
  const list = window.NTY.todayList;
  const counts = window.NTY.todayCounts;
  const today = window.NTY.schedule.days[0];
  const order = { now: 0, soon: 1, today: 2 };
  const sorted = [...list].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <section className="section tone-pink" id="today" data-section-id="today" data-screen-label="01 Today">
      <Head num="01" en="Today / 本日の出勤・営業状況" jp="本日の出勤"
        link={{ label: "出勤予定を見る →", href: "#schedule", onClick: (e) => { e.preventDefault(); goTo("schedule"); } }} />

      <div className="today-bar">
        <div className="today-date">
          <span className="big">{today.month}/{today.d}</span>
          <span className="dow">{today.dowEn} · {today.dowJp}曜</span>
        </div>
        <div className="today-hours">
          <span className="th-label">本日の営業</span>
          <span className="th-time">{window.NTY.shop.open}</span>
        </div>
        <div className="today-status">
          <div className="ts-item now"><b>{counts.now}</b><span>出勤中</span></div>
          <div className="ts-item soon"><b>{counts.soon}</b><span>まもなく</span></div>
          <div className="ts-item total"><b>{counts.total}</b><span>本日出勤</span></div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="today-empty">本日はお休みです。次回の出勤は SCHEDULE をご覧ください。</div>
      ) : (
        <div className="today-grid">
          {sorted.map(({ cast: c, time, status }) => (
            <div key={c.en} className={`today-card st-${status}`}>
              <div className="today-ph">
                <div className="ph-img" style={{ backgroundImage: `url(${c.card})` }} />
                <span className={`today-flag f-${status}`}>{TODAY_LABEL[status]}</span>
              </div>
              <div className="today-info">
                <div className="nm"><b>{c.jp}</b><small>{c.en}</small></div>
                <div className="tm">{time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── SCHEDULE (2-week calendar · 日ごとに 名前+時間/未定/休み) ──
function Schedule2() {
  const { days } = window.NTY.schedule;
  const last = days[13];
  const weeks = [days.slice(0, 7), days.slice(7, 14)];
  return (
    <section className="section tone-panel" id="schedule" data-section-id="schedule" data-screen-label="02 Schedule">
      <Head num="02" en="Schedule / Next 14 days" jp="出勤予定" />

      <div className="cal-head">
        <div className="cal-range">
          <em>2週間</em> · {days[0].month}/{days[0].d} <span className="arrow">→</span> {last.month}/{last.d}
        </div>
        <div className="cal-legend">
          <span className="ll"><i className="sw on" />出勤</span>
          <span className="ll"><i className="sw tbd" />未定</span>
          <span className="ll"><i className="sw off" />休み</span>
        </div>
      </div>

      <div className="cal2">
        {weeks.map((week, wi) => (
          <div className="cal2-week" key={wi}>
            {week.map((d) => (
              <div key={d.idx} className={`cal2-day ${d.isToday ? "today" : ""} ${d.weekend ? "wknd" : ""} st-${d.state}`}>
                <div className="c2-head">
                  <span className="c2-dow">{d.dowEn}</span>
                  <span className="c2-num">{d.d}</span>
                  <span className="c2-mon">{d.month}月</span>
                  {d.isToday && <span className="c2-today">TODAY</span>}
                </div>
                {d.closed ? (
                  <div className="c2-off">休み</div>
                ) : (
                  <ul className="c2-list">
                    {d.entries.map(({ cast: c, time }) => (
                      <li key={c.en} className={time === "未定" ? "tbd" : ""}>
                        <span className="c2-nm">{c.jp}</span>
                        <span className="c2-tm">{time === "未定" ? "未定" : time.replace(" — ", "–")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="cal-note">※ 予定は変更になる場合があります。最新情報は Instagram をご確認ください。<br />※ 出勤キャスト・時間は後日 CMS（shifts データ）から編集できるようにします。</div>
    </section>
  );
}

// ── CAST (diagram + list) ─────────────────────────────
const CAST_STATUS = {
  now:   { lbl: "出勤中",   cls: "now" },
  soon:  { lbl: "まもなく", cls: "soon" },
  today: { lbl: "本日出勤", cls: "today" },
  off:   { lbl: "在籍",     cls: "off" },
};
function CastSection() {
  const cast = window.NTY.cast;
  const [active, setActive] = useState(0);
  const cur = cast[active];
  const move = (d) => setActive((p) => (p + d + cast.length) % cast.length);

  return (
    <section className="section tone-ink" id="cast" data-section-id="cast" data-screen-label="03 Cast">
      <Head num="03" en="Cast / NAUGHTY GIRLS" jp="キャスト一覧・キャスト図" />

      {/* THUMBNAIL RAIL */}
      <div className="cast-rail">
        <div className="cr-line" />
        <div className="cr-track">
          {cast.map((c, idx) => (
            <button key={c.id} className={`cr-thumb ${idx === active ? "on" : ""}`}
              onClick={() => setActive(idx)} aria-label={c.jp}>
              <span className="crt-frame">
                <img src={c.img} alt={c.jp} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* STAGE */}
      <div className="cast-stage">
        <button className="cs-nav prev" onClick={() => move(-1)} aria-label="前のキャスト">PREV</button>
        <button className="cs-nav next" onClick={() => move(1)} aria-label="次のキャスト">NEXT</button>

        <div className="cs-figwrap">
          <div className="cs-glow" />
          {cast.map((c, idx) => (
            <img key={c.id} src={c.img} alt={c.jp}
              className={`cs-fig ${idx === active ? "on" : ""}`} />
          ))}
        </div>

        <div className="cs-info">
          <div className="csi-badge">
            <span className={`csi-flag k-${cur.badge.kind}`}>{cur.badge.label}</span>
            <span className="csi-detail">{cur.badge.detail}</span>
          </div>
          <div className="csi-en">{cur.en}</div>
          <h3 className="csi-name">{cur.jp}</h3>
          <p className="csi-catch">{cur.catch}</p>
          <p className="csi-comment">{cur.comment}</p>
          <div className="csi-tags">
            {cur.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── GALLERY (CAST直下の店内ギャラリー) ───────────────
function GallerySection() {
  const gallery = window.NTY.gallery || [];
  return (
    <section className="section tone-panel" id="gallery" data-section-id="gallery" data-screen-label="04 Gallery">
      <Head num="04" en="Gallery / Interior" jp="店内ギャラリー" />
      {gallery.length ? (
        <div className="gallery-grid">
          {gallery.map((item) => (
            <article className="gallery-card" key={item.id}>
              <div className="gallery-media">
                <image-slot id={`gallery-${item.id}`} src={item.image || ""} placeholder="ギャラリー画像をドロップ" shape="rounded" radius="2"
                  style={{ width: "100%", height: "100%", display: "block" }}></image-slot>
                <span>{item.no}</span>
              </div>
              <div className="gallery-meta">
                <small>{String(item.kind || "photo").toUpperCase()}</small>
                <h3>{item.title}</h3>
                <p>{item.caption}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="gallery-empty">ギャラリー画像は管理画面から追加できます。</div>
      )}
    </section>
  );
}

// ── INSIDE (店内紹介) ─────────────────────────────────
function Inside() {
  return (
    <section className="section tone-panel" id="inside" data-section-id="inside" data-screen-label="05 Inside">
      <Head num="05" en="Inside / Interior" jp="店内紹介" />
      <div className="inside-list">
        {window.NTY.inside.map((b, i) => (
          <div key={b.slot} className={`inside-row ${i % 2 ? "rev" : ""}`}>
            <div className="inside-media">
              <image-slot id={b.slot} src={b.image || ""} placeholder={b.placeholder} shape="rounded" radius="2"
                style={{ width: "100%", height: "100%", display: "block" }}></image-slot>
              <span className="inside-no">{b.no}</span>
            </div>
            <div className="inside-text">
              <h3>{b.title}</h3>
              <p>{b.body}</p>
              <div className="inside-tags">{b.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── EVENT ─────────────────────────────────────────────
function EventSection() {
  const ev = window.NTY.event;
  return (
    <section className="section tone-pink" id="event" data-section-id="event" data-screen-label="06 Event">
      <Head num="06" en="Event / Upcoming" jp="イベント" />
      <div className="event-lead">
        <p className="el-big">{ev.lead}</p>
        <p className="el-note">{ev.note}</p>
      </div>
      <div className="event-grid">
        {ev.items.slice(0, 3).map((it, i) => (
          <div key={i} className="event-card">
            <div className="ec-top">
              <span className="ec-date">{it.date}</span>
              <span className="ec-tag">{it.tag}</span>
            </div>
            <div className="ec-title">{it.title}</div>
            <p className="ec-desc">{it.desc}</p>
            <div className="ec-arrow">詳細は近日公開</div>
          </div>
        ))}
      </div>
      <a className="event-insta" href={window.NTY.shop.instagramUrl} target="_blank" rel="noopener">
        <span>最新のイベント情報は Instagram で先行告知</span>
        <b>{window.NTY.shop.instagram} →</b>
      </a>
    </section>
  );
}

// ── ACCESS ────────────────────────────────────────────
function AccessSection() {
  const v = window.NTY.venue;
  return (
    <section className="section tone-ink" id="access" data-section-id="access" data-screen-label="07 Access">
      <Head num="07" en="Access / Info" jp="アクセス" />
      <div className="access-grid">
        <div className="access-map">
          <div className="grid-bg" />
          <div className="road h1" />
          <div className="road v1" />
          <div className="pin"><div className="dot" /><div className="lbl">NAUGHTY</div></div>
          <div className="meta">
            <span className="tag" style={{ padding: "4px 8px" }}>MAP</span>
            <span className="tag ghost" style={{ padding: "4px 8px" }}>NAGAREKAWA</span>
          </div>
        </div>
        <div className="access-info">
          <div className="sub">{v.tagline.toUpperCase()}</div>
          <h3>{v.name} <span className="ai-area">{v.areaJp}</span></h3>
          <dl>
            <dt>OPEN</dt><dd><b>{v.open}</b></dd>
            <dt>AREA</dt><dd>{v.address}<br /><span className="ai-note">{v.addressNote}</span></dd>
            <dt>HOLIDAY</dt><dd>{v.holiday}</dd>
            <dt>INSTAGRAM</dt><dd>{v.instagram}</dd>
            <dt>PAY</dt><dd>{v.pay}</dd>
          </dl>
          <div className="access-actions">
            <a className="cta" href={v.mapUrl} target="_blank" rel="noopener">Google Maps <span>→</span></a>
            <a className="cta ghost" href={v.instagramUrl} target="_blank" rel="noopener">Instagram <span>→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── RECRUIT 導線 ──────────────────────────────────────
function Recruit() {
  const r = window.NTY.recruit;
  return (
    <section className="cta-strip recruit-strip" id="recruit" data-section-id="recruit" data-screen-label="08 Recruit">
      <div className="ribbon">RECRUIT · NAUGHTY GIRLS · 募集中 · RECRUIT · NAUGHTY GIRLS · 募集中 · </div>
      <div className="recruit-inner">
        <div className="recruit-head">
          <div className="rs-kicker">{r.kicker}</div>
          <h2><em>いたずらっ子</em>、募集中。</h2>
          <p className="rs-sub">{r.sub}</p>
          <a className="cta" href={r.href}>採用情報を見る <span>→</span></a>
        </div>
        <ul className="recruit-merits">
          {r.merits.map((m, i) => (
            <li key={i}>
              <span className="rm-no">0{i + 1}</span>
              <div className="rm-body"><b>{m.t}</b><span>{m.d}</span></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── FOOTER ────────────────────────────────────────────
function Footer2() {
  const links = window.NTY.sections.filter((s) => s.id !== "top");
  return (
    <footer className="foot" data-screen-label="09 Footer">
      <div className="foot-grid">
        <div className="foot-brand">
          <div className="logo"><img src="assets/logo-naughty-dark.png" alt="NAUGHTY" /></div>
          <div className="tag-jp">{window.NTY.venue.areaJp} · {window.NTY.venue.tagline}</div>
          <div className="socials">
            <a href={window.NTY.shop.instagramUrl} target="_blank" rel="noopener" aria-label="Instagram"><img src="assets/icon-instagram.png" alt="" /></a>
            <a href="#" aria-label="TikTok" onClick={(e) => e.preventDefault()}><img src="assets/icon-tiktok.png" alt="" /></a>
            <a href={`mailto:${window.NTY.shop.mail || ""}`} aria-label="Mail"><img src="assets/icon-mail.png" alt="" /></a>
          </div>
        </div>
        <div>
          <h5>Sitemap</h5>
          <ul>
            {links.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); goTo(s.id); }}>{s.en} <span className="fl-jp">{s.jp}</span></a></li>
            ))}
          </ul>
        </div>
        <div>
          <h5>Information</h5>
          <ul>
            <li><a href="#" onClick={(e) => e.preventDefault()}>ご予約について</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>店舗ルール</a></li>
            <li><a href="recruit.html">採用情報</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>お問い合わせ</a></li>
          </ul>
        </div>
        <div>
          <h5>Open</h5>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.8 }}>
            {window.NTY.venue.open}<br />{window.NTY.venue.holiday}<br />{window.NTY.venue.areaJp}
          </p>
        </div>
      </div>
      <div className="foot-bottom">
        <div className="copy">© 2026 NAUGHTY</div>
        <div className="legal">
          <a href="#" onClick={(e) => e.preventDefault()}>PRIVACY</a>
          <a href="#" onClick={(e) => e.preventDefault()}>TERMS</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav2, Today, Schedule2, CastSection, GallerySection, Inside, EventSection, AccessSection, Recruit, Footer2, goTo, Head, MobileHeroCast });

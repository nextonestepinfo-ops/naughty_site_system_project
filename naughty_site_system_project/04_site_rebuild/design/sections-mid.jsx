/* global React */
// =====================================================
// naughty — Cast section + Schedule (cast × date matrix)
// =====================================================

function Cast({ variant }) {
  const cast = window.NaughtyCast;
  return (
    <section className="section" data-screen-label="03 Cast" id={variant === "mobile" ? "cast-m" : "cast"}>
      <div className="section-head">
        <div className="num">03<em>.</em></div>
        <div className="titles">
          <div className="en">— Cast / 8 members</div>
          <div className="jp">キャストリスト</div>
        </div>
        <div className="nav-links">
          <a className="underline-link" href="#">View all →</a>
        </div>
      </div>

      <div className="cast-row">
        <div style={{ display: "flex", gap: 6 }}>
          <span className="tag ghost">ALL</span>
          <span className="tag">DEVIL</span>
          <span className="tag">ANGEL</span>
          <span className="tag">CAT</span>
        </div>
      </div>

      <div className="cast-grid">
        {cast.map((c, i) =>
        <a key={c.en} href="#" className="cast-card">
            <div className="ph" style={c.photo ? { backgroundImage: `url(${c.photo})`, backgroundSize: "cover", backgroundPosition: "center top" } : null} data-has-photo={c.photo ? "true" : "false"}>
              <span className="num">CAST · 0{i + 1}</span>
              {i === 0 && <span className="stamp">FEATURED</span>}
              {i === 7 && <span className="stamp">NEW</span>}
              {i === 2 && <span className="stamp">NEW</span>}
            </div>
            <div className="meta">
              <div>
                <div className="name-en">{c.en}</div>
                <div className="name-jp">{c.jp}</div>
              </div>
              <span className="arrow">→</span>
            </div>
            <div className="tags">
              {c.tags.map((t) => <span key={t}>{t}</span>)}
            </div>
          </a>
        )}
      </div>
    </section>);

}

// ─── Schedule (cast × date matrix) ──────────────────
function Schedule({ variant }) {
  const cast = window.NaughtyCast;
  const matrix = window.NaughtyScheduleMatrix;
  const dates = window.NaughtyWeekDates;

  return (
    <section className="section" data-screen-label="04 Schedule" id={variant === "mobile" ? "schedule-m" : "schedule"} style={{ background: "var(--paper-2)" }}>
      <div className="section-head">
        <div className="num">04<em>.</em></div>
        <div className="titles">
          <div className="en">— Schedule / Weekly</div>
          <div className="jp">出勤予定表</div>
        </div>
        <div className="nav-links">
          <a className="underline-link" href="#">月間カレンダー →</a>
        </div>
      </div>

      <div className="sched-controls">
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div className="week">
            <em>W21</em> · May 18 — May 24, 2026
          </div>
          <div className="nav-pager">
            <button className="tag">← prev</button>
            <button className="tag solid">this week</button>
            <button className="tag">next →</button>
          </div>
        </div>
        <div className="view-toggle">
          <button className="active">Matrix</button>
          <button>List</button>
          <button>Calendar</button>
        </div>
      </div>

      <div className="matrix-wrap">
        <div className="matrix">
          {/* Header row */}
          <div className="cell corner"><span>CAST / DATE</span></div>
          {dates.map((d) =>
          <div key={d.d} className={`cell head ${d.today ? "today" : ""}`}>
              <div className="d-week">{d.w}</div>
              <div className="d-num">{d.d}</div>
            </div>
          )}

          {/* Cast rows */}
          {cast.map((c, ri) =>
          <React.Fragment key={c.en}>
              <div className="cell cast-head">
                <div className="av" />
                <div className="nm">
                  {c.en}
                  <small>{c.jp}</small>
                </div>
              </div>
              {matrix[ri].map((v, ci) => {
              if (v === "event") {
                return (
                  <div key={ci} className="cell slot event">
                      <span className="lbl">EVENT</span>
                      <span className="t">20:00 — 26:00</span>
                    </div>);

              }
              if (v === true) {
                return (
                  <div key={ci} className="cell slot on">
                      <span className="lbl">ON</span>
                      <span className="t">20:00 — 26:00</span>
                    </div>);

              }
              return <div key={ci} className="cell slot off" />;
            })}
            </React.Fragment>
          )}
        </div>
      </div>

      <div className="sched-legend">
        <div className="ll"><span className="sw on" /> 出勤</div>
        <div className="ll"><span className="sw event" /> 特別イベント</div>
        <div className="ll"><span className="sw off" /> 休み</div>
        <div className="ll" style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
          ※ 予定は変更になる場合があります
        </div>
      </div>
    </section>);

}

Object.assign(window, { Cast, Schedule });
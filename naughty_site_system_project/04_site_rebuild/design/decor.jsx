/* global React */
// =====================================================
// naughty — decorative accents (scattered icons, side rails,
// big italic display words, halftone patterns)
//
// All purely visual / aria-hidden.
// =====================================================

// Scattered decoration cluster for the FV — uses the existing icon PNGs.
function FVDecor() {
  return (
    <div className="fv-decor" aria-hidden="true">
      <span className="dec-star dec-star-1" />
      <span className="dec-star dec-star-2" />
      <span className="dec-star dec-star-3" />
      <span className="dec-star dec-star-4" />
      <span className="dec-star dec-star-5" />

      <img className="dec-ico dec-cat"    src="assets/icon-cat.png" alt="" />
      <img className="dec-ico dec-devil"  src="assets/icon-menu-devil.png" alt="" />
      <img className="dec-ico dec-bubble" src="assets/icon-bubble.png" alt="" />
      <img className="dec-ico dec-mail"   src="assets/icon-mail.png" alt="" />
      <img className="dec-ico dec-wing-l" src="assets/icon-wing-left.png" alt="" />
      <img className="dec-ico dec-wing-r" src="assets/icon-wing-right.png" alt="" />

      <div className="dec-blob dec-blob-l" />
      <div className="dec-blob dec-blob-r" />

      <div className="dec-marquee dec-marquee-top">
        <div className="dec-track">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i}>
              naughty<span className="sep">·</span>est. 2026<span className="sep">·</span>night<span className="sep">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Big italic word floating in the side margin of a section
function SideWord({ word = "naughty", side = "left", offset = 40 }) {
  const styleObj = side === "left"
    ? { left: -offset, writingMode: "vertical-rl" }
    : { right: -offset, writingMode: "vertical-rl", transform: "rotate(180deg)" };
  return (
    <div className="side-word" style={styleObj} aria-hidden="true">{word}</div>
  );
}

// Decorative section divider strip with halftone and an italic word
function SectionDivider({ word = "naughty" }) {
  return (
    <div className="section-divider" aria-hidden="true">
      <span className="halftone" />
      <span className="divider-bullet">✦</span>
      <span className="divider-word">{word}</span>
      <span className="divider-bullet">✦</span>
      <span className="halftone" />
    </div>
  );
}

// Sparkle cluster - tiny rotating stars
function Sparkles({ count = 6 }) {
  return (
    <div className="sparkles" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`spark spark-${i + 1}`} />
      ))}
    </div>
  );
}

Object.assign(window, { FVDecor, SideWord, SectionDivider, Sparkles });

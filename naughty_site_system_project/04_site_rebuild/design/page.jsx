/* global React */
// =====================================================
// naughty — Page composer
//   <Page variant="desktop" tweaks={...} />
// =====================================================

function Page({ variant = "desktop", tweaks = {} }) {
  const tone = tweaks.tone || "sharp";
  const fvStyle = tweaks.fvStyle || "webcam-glitch";
  const showLoader = tweaks.showLoader !== false;
  const loaderKey = tweaks.loaderKey || 0;
  const copy = window.NaughtyCopy[tone];

  return (
    <div
      className={`nty ${variant === "mobile" ? "mobile" : "desktop"}`}
      data-screen-label={`naughty TOP · ${variant}`}
      data-tone={tone}
      data-fv={fvStyle}
    >
      <Nav variant={variant} />
      <FV variant={variant} copy={copy} fvStyle={fvStyle} />
      <JumpNav variant={variant} />
      <Concept variant={variant} copy={copy} />
      <Cast variant={variant} />
      <Schedule variant={variant} />
      <News variant={variant} copy={copy} />
      <Access variant={variant} />
      <CTAStrip copy={copy} />
      <Footer variant={variant} />
      <ScrollAccents variant={variant} />
      {showLoader && window.Loading && (
        <Loading variant={variant} replayKey={loaderKey} />
      )}
    </div>
  );
}

window.Page = Page;

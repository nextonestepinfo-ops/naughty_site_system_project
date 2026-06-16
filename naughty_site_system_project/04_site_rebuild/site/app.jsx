/* global React, ReactDOM */
// =====================================================
// NAUGHTY V3 — site composer
// =====================================================

function SiteApp() {
  const shop = window.NTY.shop;
  const copy = {
    fvMeta: "EST. 2026 — HIROSHIMA",
    fvBadge: `OPEN ${shop.open}`,
    fvTagline: "今夜も、流川の片隅で。",
    fvLine2: "ちいさな、",
    fvLineEm: "いたずら。",
    fvSub: shop.concept || "黒にピンクが一滴。広島・流川の小さなコンセプトカフェ「NAUGHTY」。"
  };

  return (
    <div className="nty" data-screen-label="NAUGHTY" data-active-section="top" data-active-tone="ink">
      <PatternBackground />
      <Nav2 />

      <div className="top-wrap" data-section-id="top">
        <FV variant="desktop" copy={copy} fvStyle="webcam-glitch" />
        <MobileHeroCast />
      </div>

      <Today />
      <Schedule2 />
      <CastSection />
      <GallerySection />
      <Inside />
      <EventSection />
      <AccessSection />
      <Recruit />
      <Footer2 />

      <ScrollAccents variant="desktop" />
      <Loading variant="desktop" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SiteApp />);

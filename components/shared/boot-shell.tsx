/**
 * What the browser paints first, straight from the server HTML, before any JavaScript has run: the outline of the app
 * (sidebar, top bar, cards) in the theme's own colors. It replaces the old plain spinner on an empty dark / white screen,
 * so opening a branch website never shows a blank "loading" page. It has no state and no hooks on purpose.
 * Styles: the `.bs-*` block at the end of app/fast.css (theme variables only, so light and dark both follow the theme).
 */
export function BootShell() {
  return <div className="bs" role="status" aria-live="polite" aria-label="Memuat Mieflow">
    <aside className="bs-side" aria-hidden="true">
      <div className="bs-brand"><span className="bs-logo">M</span><span className="bs-name"><b>MIEFLOW</b><small>BUSINESS POS</small></span></div>
      <div className="bs-nav"><i/><i/><i/><i/><i/><i/><i/></div>
    </aside>
    <main className="bs-main" aria-hidden="true">
      <div className="bs-top"><span className="bs-menu"><b>M</b></span><i className="bs-title"/><i className="bs-pill"/></div>
      <div className="bs-row"><i/><i/><i/><i/></div>
      <div className="bs-hero"/>
      <div className="bs-grid"><i/><i/><i/></div>
    </main>
  </div>;
}

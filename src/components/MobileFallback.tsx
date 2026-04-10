export default function MobileFallback() {
  return (
    <div className="mobile-fallback">
      <div className="mobile-fallback-inner">
        <div className="mobile-fallback-icon" role="img" aria-label="whale">
          🐳
        </div>
        <h1 className="mobile-fallback-title">Bay Whale Strandings</h1>
        <p className="mobile-fallback-text">
          This interactive map is best viewed on a desktop or larger screen.
          Please visit on a device with a wider display to explore the data.
        </p>
        <p className="mobile-fallback-credit">
          Designed and built by{" "}
          <a
            href="https://izgiuygur.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Izgi Uygur
          </a>
        </p>
      </div>
    </div>
  );
}

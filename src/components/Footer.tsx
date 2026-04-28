interface Props {
  onAboutClick: () => void;
}

// Site footer with the canonical data attribution. The "About the
// data" link opens the same modal as the contextual note near the
// map.
export default function Footer({ onAboutClick }: Props) {
  return (
    <footer className="site-footer">
      <span>
        Data: West Coast Region Marine Mammal Stranding Network (WCR-MMSN),
        coordinated by NOAA Fisheries. Accessed April 7, 2026.
      </span>{" "}
      <button
        type="button"
        className="site-footer-link"
        onClick={onAboutClick}
      >
        About the data
      </button>
    </footer>
  );
}

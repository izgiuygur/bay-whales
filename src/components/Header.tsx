interface Props {
  /** Click handler for the title — resets app to default explore mode
   *  (close active story, clear filters, reset map view, dismiss
   *  any live intro animation). */
  onHomeClick?: () => void;
}

// Desktop header. The title doubles as a "home" button — clicking it
// is the canonical "reset everything to the default state" gesture,
// matching how site logos work elsewhere on the web.
export default function Header({ onHomeClick }: Props) {
  return (
    <header className="header">
      <div className="header-block">
        <button
          type="button"
          className="header-title"
          onClick={onHomeClick}
          aria-label="Bay Whale Strandings — reset to home"
        >
          BAY WHALE STRANDINGS
        </button>
        <p className="header-subtitle">
          An interactive map of whale strandings across the San Francisco Bay
          Area
        </p>
      </div>
    </header>
  );
}

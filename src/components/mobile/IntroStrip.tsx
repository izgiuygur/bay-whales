import { useState } from "react";

const STORAGE_KEY = "bws.introDismissed";

function readDismissedInitial(): boolean {
  // Read synchronously so we don't flash the strip before hiding it.
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface Props {
  recordCount: number;
}

export default function IntroStrip({ recordCount }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(readDismissedInitial);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Best effort — still hide for this session.
    }
    setDismissed(true);
  };

  return (
    <section className="m-intro" aria-label="About this map">
      <p className="m-intro-text">
        Tracking <strong>{recordCount}</strong> whale strandings reported
        across the San Francisco Bay Area since 2005. Data from NOAA
        Fisheries, The Marine Mammal Center, and the California Academy
        of Sciences.
      </p>
      <button
        type="button"
        className="m-intro-close"
        onClick={dismiss}
        aria-label="Dismiss introduction"
      >
        &times;
      </button>
    </section>
  );
}

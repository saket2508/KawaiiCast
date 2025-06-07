import { useState, useEffect } from "react";
import { WEBTORRENT_TRACKERS } from "../utils/torrent";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WebTorrent: any;
  }
}

export const useWebTorrent = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [client, setClient] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wtClient: any = null;

    const initializeWebTorrent = async () => {
      try {
        // Load WebTorrent script
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js";
        script.async = true;

        script.onload = () => {
          if (window.WebTorrent) {
            wtClient = new window.WebTorrent({
              tracker: {
                announce: WEBTORRENT_TRACKERS,
              },
            });

            wtClient.on("error", (err: Error) => {
              console.error("WebTorrent Error:", err);
              setError(`WebTorrent Error: ${err.message}`);
            });

            setClient(wtClient);
            setIsLoading(false);
          } else {
            setError(
              "Failed to load WebTorrent. Please check your internet connection."
            );
            setIsLoading(false);
          }
        };

        script.onerror = () => {
          setError("Error loading WebTorrent script. Please try again.");
          setIsLoading(false);
        };

        document.body.appendChild(script);
      } catch {
        setError("Failed to initialize WebTorrent");
        setIsLoading(false);
      }
    };

    initializeWebTorrent();

    return () => {
      if (wtClient) {
        wtClient.destroy(() => {
          console.log("WebTorrent client destroyed");
        });
      }
    };
  }, []);

  return { client, isLoading, error };
};

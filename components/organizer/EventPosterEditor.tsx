"use client";

import { useState, useTransition } from "react";
import PosterUpload from "@/components/organizer/PosterUpload";
import { updateEventPoster } from "@/lib/actions/events";

export default function EventPosterEditor({
  eventId,
  organizerId,
  currentPosterUrl,
}: {
  eventId: string;
  organizerId: string;
  currentPosterUrl: string | null;
}) {
  const [posterUrl, setPosterUrl] = useState(currentPosterUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUploaded(url: string) {
    setPosterUrl(url);
    setSaved(false);
    setError(null);

    startTransition(async () => {
      const result = await updateEventPoster(eventId, url);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div>
      <PosterUpload
        organizerId={organizerId}
        eventId={eventId}
        currentPosterUrl={posterUrl}
        onUploaded={handleUploaded}
      />
      {isPending && <p className="mt-2 text-xs text-ink/40">Saving…</p>}
      {saved && !isPending && (
        <p className="mt-2 text-xs font-medium text-success">
          Poster updated.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const STORAGE_PATH_MARKER = "/storage/v1/object/public/event-posters/";

function extractStoragePath(publicUrl: string): string | null {
  const idx = publicUrl.indexOf(STORAGE_PATH_MARKER);
  if (idx === -1) return null; // not one of our bucket's URLs (e.g. an old pasted link) — nothing to clean up
  return publicUrl.slice(idx + STORAGE_PATH_MARKER.length);
}

export default function PosterUpload({
  organizerId,
  eventId,
  currentPosterUrl,
  onUploaded,
}: {
  organizerId: string;
  eventId: string;
  currentPosterUrl?: string | null;
  onUploaded: (publicUrl: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentPosterUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);
    setIsUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // Storage write policies check that the first path segment matches the
    // uploading organizer's own auth.uid() — this exact shape is required,
    // not just convention.
    const path = `${organizerId}/${eventId}/poster-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("event-posters")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError("Couldn't upload the image. Please try again.");
      setIsUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-posters").getPublicUrl(path);

    // Best-effort cleanup of the previous poster file — never blocks the
    // new upload from succeeding if this fails, and skipped entirely for a
    // poster that isn't actually one of our bucket's files (e.g. an old
    // pasted external URL from before uploads existed).
    if (currentPosterUrl) {
      const oldPath = extractStoragePath(currentPosterUrl);
      if (oldPath && oldPath !== path) {
        supabase.storage
          .from("event-posters")
          .remove([oldPath])
          .catch(() => {});
      }
    }

    setIsUploading(false);
    onUploaded(publicUrl);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-purple-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Poster preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-ink/30">
              No image
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading
              ? "Uploading…"
              : preview
                ? "Replace poster"
                : "Upload poster"}
          </button>
          <p className="mt-1.5 text-xs text-ink/40">
            JPEG, PNG, or WEBP. Max 5MB.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

import { useId, useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES, toSquareAvatar } from "@/lib/image";
import { cn } from "@/lib/cn";

type AvatarUploadProps = {
  name: string;
  src?: string | null;
  /** Receives a resized data URL, or null when the photo is removed. */
  onChange: (src: string | null) => void;
};

/** Profile photo picker: click or drop an image; it's cropped square and resized before saving. */
export function AvatarUpload({ name, src, onChange }: AvatarUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    const result = await toSquareAvatar(file);
    setBusy(false);
    if (result.ok) onChange(result.dataUrl);
    else setError(result.error);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        aria-label={src ? "Change profile photo" : "Upload profile photo"}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group relative cursor-pointer rounded-full ring-offset-2 ring-offset-card transition-shadow focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
          dragging && "ring-2 ring-accent",
        )}
      >
        <Avatar name={name} src={src} size="xl" />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100",
            (busy || dragging) && "opacity-100",
          )}
        >
          {busy ? (
            <span className="size-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Icon name="camera" className="size-6" />
          )}
        </span>
      </button>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={<Icon name="upload" className="size-3.5" />} disabled={busy} onClick={() => inputRef.current?.click()}>
            {src ? "Change photo" : "Upload photo"}
          </Button>
          {src ? (
            <Button size="sm" variant="ghost" className="text-bad" disabled={busy} onClick={() => onChange(null)}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted">JPG, PNG, WebP or GIF, up to 5 MB. Drop an image on the circle too.</p>
        {error ? (
          <p role="alert" className="text-xs font-semibold text-bad">
            {error}
          </p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => void accept(event.target.files?.[0])}
      />
    </div>
  );
}

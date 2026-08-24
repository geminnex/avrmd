"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus, LoaderCircle, ShieldAlert, X } from "lucide-react";

type UploadedImage = { url: string; mimeType: string; previewName: string };

type PostComposerProps = {
  entitySlug?: string;
  kind?: "update" | "blog";
  placeholder?: string;
  /** Group panels manage their own local list rather than a full page refresh. */
  onPosted?: () => void;
};

export function PostComposer({ entitySlug, kind, placeholder, onPosted }: PostComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/posts/media", { method: "POST", body: formData });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Upload failed.");
        return;
      }
      setImage({ url: payload.url, mimeType: payload.mimeType, previewName: file.name });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError(null);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          entitySlug,
          kind,
          media: image ? [{ url: image.url, mimeType: image.mimeType }] : undefined,
        }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Couldn't post that.");
        return;
      }

      setBody("");
      setImage(null);
      if (onPosted) onPosted();
      else router.refresh();
    } finally {
      setPosting(false);
    }
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      <textarea
        maxLength={3000}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder ?? "Share an update with medical XR professionals…"}
        rows={3}
        value={body}
      />

      {image && (
        <div className="composer-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={image.url} />
          <button aria-label="Remove image" onClick={() => setImage(null)} type="button">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="form-message error" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="composer-actions">
        <label className="composer-attach">
          <ImagePlus size={18} />
          <input
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading || Boolean(image)}
            hidden
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          {uploading ? "Uploading…" : "Photo"}
        </label>
        <button disabled={posting || !body.trim()} type="submit">
          {posting ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <>
              Post
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

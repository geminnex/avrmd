"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

export function LikeButton({
  postId,
  count,
  initialLiked = false,
}: {
  postId: string;
  count: number;
  initialLiked?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [total, setTotal] = useState(count);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    try {
      const response = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }
      const payload = await response.json();
      if (payload.ok) {
        setLiked(payload.liked);
        setTotal((value) => value + (payload.liked ? 1 : -1));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button aria-pressed={liked} className="like-button" disabled={pending} onClick={toggle} type="button">
      <Heart fill={liked ? "currentColor" : "none"} size={15} />
      {total > 0 ? total : "Like"}
    </button>
  );
}

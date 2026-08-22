"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, LoaderCircle } from "lucide-react";

type FollowButtonProps = {
  followingType: "user" | "entity";
  followingId: string;
  label?: string;
};

export function FollowButton({ followingType, followingId, label }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  // Distinguishes "checked, not following" from "haven't checked yet" so the
  // button doesn't flash a wrong state while the initial fetch is in flight.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/follows?type=${followingType}&id=${encodeURIComponent(followingId)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setFollowing(Boolean(payload.following));
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [followingType, followingId]);

  async function toggle() {
    setPending(true);
    try {
      const response = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingType, followingId }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      const payload = await response.json();
      if (payload.ok) setFollowing(payload.following);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      aria-pressed={following}
      className="follow-button"
      disabled={!loaded || pending}
      onClick={toggle}
      type="button"
    >
      {pending ? (
        <LoaderCircle className="spin" size={15} />
      ) : following ? (
        <BellRing size={15} />
      ) : (
        <Bell size={15} />
      )}
      {following ? "Following" : label ?? "Follow"}
    </button>
  );
}

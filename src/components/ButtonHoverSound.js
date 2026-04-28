"use client";
import { useEffect } from "react";
import AudioManager from "@/lib/audio";

function getSoundSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("ltt_settings") || "{}");
    return {
      enabled: typeof saved.sound !== "undefined" ? saved.sound : true,
      effect: saved.soundEffect || "default",
    };
  } catch {
    return { enabled: true, effect: "default" };
  }
}

export default function ButtonHoverSound() {
  useEffect(() => {
    const unlock = () => AudioManager.resume();
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    const handleMouseOver = (e) => {
      const { enabled, effect } = getSoundSettings();
      if (!enabled) return;
      const button = e.target.closest('button, [role="button"], a');
      if (!button) return;
      const from = e.relatedTarget;
      if (from && button.contains(from)) return;
      AudioManager.playEffect(effect);
    };

    document.addEventListener("mouseover", handleMouseOver, true);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}

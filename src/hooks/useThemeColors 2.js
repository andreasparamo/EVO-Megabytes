import { useState, useEffect } from 'react';

const getThemeColors = () => {
  if (typeof window === "undefined") {
    return {
      accent1: "#e74c3c",
      text: "#ffffff",
      muted: "#888888",
      bg: "#1a1a1a",
    };
  }

  const styles = getComputedStyle(document.body);
  return {
    accent1: styles.getPropertyValue("--accent-1").trim() || "#e74c3c",
    text: styles.getPropertyValue("--text").trim() || "#ffffff",
    muted: styles.getPropertyValue("--muted").trim() || "#888888",
    bg: styles.getPropertyValue("--bg").trim() || "#1a1a1a",
  };
};

export default function useThemeColors() {
  const [colors, setColors] = useState(getThemeColors());

  useEffect(() => {
    // Initial fetch in case theme wasn't ready during first render
    setColors(getThemeColors());

    // Observe body for class changes (theme switching)
    const observer = new MutationObserver(() => {
      setColors(getThemeColors());
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return colors;
}

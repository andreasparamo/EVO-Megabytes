"use client";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile } from "@/lib/firestoreService";
import AudioManager from "@/lib/audio";
import { usePathname } from "next/navigation";

export default function ThemeInitializer() {
  const { user } = useAuth();
  const pathname = usePathname();

  const applyThemeClass = (theme) => {
    if (typeof document === 'undefined') return;
    Array.from(document.body.classList).forEach((c) => {
      if (c.startsWith('theme-')) document.body.classList.remove(c);
    });

    if (!theme) return;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
      document.body.classList.add('theme-auto');
    } else {
      document.body.classList.add(`theme-${theme}`);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      let localThemeApplied = false;
      try {
        const local = localStorage.getItem('ltt_settings');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && parsed.theme) {
            applyThemeClass(parsed.theme);
            localThemeApplied = true;
          }
        }
      } catch (e) {
        // ignore
      }

      if (!localThemeApplied) {
        applyThemeClass('dark');
      }

      if (user && user.uid) {
        try {
          const res = await getUserProfile(user.uid);
          if (res.success && res.data && res.data.settings) {
            if (res.data.settings.theme) {
              applyThemeClass(res.data.settings.theme);
            }
            try {
              localStorage.setItem('ltt_settings', JSON.stringify(res.data.settings));
            } catch (e) {}
          }
        } catch (err) {
          // ignore
        }
      }
    };

    load();

    const onKeyDown = (e) => {
      try {
        const key = e.key;
        if (!key || key.length !== 1) return; // printable only
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        let saved = null;
        try { saved = JSON.parse(localStorage.getItem('ltt_settings') || '{}'); } catch (err) { saved = null; }
        const enabled = saved && typeof saved.sound !== 'undefined' ? saved.sound : true;
        const effect = saved && saved.soundEffect ? saved.soundEffect : 'default';
        if (!enabled) return;

        const ctx = AudioManager.ensure();
        if (ctx && ctx.state === 'suspended') {
          AudioManager.resume().catch(() => {});
        }

        AudioManager.playEffect(effect);
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener('keydown', onKeyDown, { passive: true });

    // Enforce theme class on body to prevent Next.js from stripping it during route transitions
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const hasTheme = Array.from(document.body.classList).some(c => c.startsWith('theme-'));
          if (!hasTheme) {
            try {
              const local = localStorage.getItem('ltt_settings');
              if (local) {
                const parsed = JSON.parse(local);
                if (parsed && parsed.theme) {
                  applyThemeClass(parsed.theme);
                  return;
                }
              }
            } catch (e) {}
            applyThemeClass('dark');
          }
        }
      }
    });
    
    if (typeof document !== 'undefined') {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      mounted = false;
      try { document.removeEventListener('keydown', onKeyDown); } catch (e) {}
      observer.disconnect();
    };
  }, [user, pathname]);

  return null;
}

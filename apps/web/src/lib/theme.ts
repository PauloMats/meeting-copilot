import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function preferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("mc_theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(preferredTheme);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystemPreference = () => {
      const stored = window.localStorage.getItem("mc_theme");
      if (stored !== "light" && stored !== "dark") {
        setTheme(preference.matches ? "dark" : "light");
      }
    };

    preference.addEventListener("change", followSystemPreference);
    return () => preference.removeEventListener("change", followSystemPreference);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("mc_theme", next);
      return next;
    });
  }

  return { theme, toggleTheme };
}

// src/components/Layouts/dashboard/theme-toggle/index.tsx
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCookie } from "@/lib/cookieUtils";
import { useTheme } from "@/app/provider";
import { handleThemeToggleClick } from "@/utils/themeTransitions";
import { Moon, Sun } from "./icons";

const THEMES = [
  { name: "light", Icon: Sun },
  { name: "dark",  Icon: Moon },
];

export function ThemeToggleSwitch() {
  const { toggleTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const theme = getCookie("theme");
    setIsDark(theme === "dark");
  }, []);

  const handleToggle = async (
    event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsDark((prev) => !prev);
    await handleThemeToggleClick(event, async () => {
      await toggleTheme(event.currentTarget);
    });
  };

  if (!mounted) return null;

  return (
    <button
      onClick={handleToggle}
      onTouchEnd={handleToggle}
      className="group rounded-full bg-gray-3 dark:bg-[hsl(var(--background))] dark:text-current"
      style={{
        padding: "3px",
        outline: "none",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
      }}
    >
      <span className="sr-only">
        Switch to {isDark ? "light" : "dark"} mode
      </span>

      <span aria-hidden className="relative flex gap-1">
        {/* Sliding indicator */}
        <span
          className={cn(
            "absolute size-[22px] rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] transition-all",
            isDark
              ? "translate-x-[26px] border-none bg-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--accent))]"
              : ""
          )}
        />

        {THEMES.map(({ name, Icon }) => (
          <span
            key={name}
            className={cn(
              "relative grid size-[22px] place-items-center rounded-full",
              name === "dark" && isDark && "text-[hsl(var(--foreground))]"
            )}
          >
            <Icon />
          </span>
        ))}
      </span>
    </button>
  );
}
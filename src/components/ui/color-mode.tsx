"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export type ColorMode = "light" | "dark";

export interface UseColorModeReturn {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
}

export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const colorMode =
    (resolvedTheme ?? theme ?? "light") === "dark" ? "dark" : "light";

  return {
    colorMode,
    setColorMode: (nextColorMode) => setTheme(nextColorMode),
    toggleColorMode: () => setTheme(colorMode === "dark" ? "light" : "dark"),
  };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return colorMode === "dark" ? dark : light;
}

export function ColorModeButton(
  props: Omit<React.ComponentProps<typeof Button>, "aria-label" | "onClick">,
) {
  const { colorMode, toggleColorMode } = useColorMode();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Toggle color mode"
      onClick={toggleColorMode}
      {...props}
    >
      {!mounted ? (
        <span className="size-4" />
      ) : colorMode === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}

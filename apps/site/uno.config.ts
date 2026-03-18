import { defineConfig, presetWind3 } from "unocss"

export default defineConfig({
  presets: [presetWind3()],
  theme: {
    colors: {
      ink: "var(--ink)",
      paper: "var(--paper)",
      background: "var(--background)",
      foreground: "var(--foreground)",
      muted: { DEFAULT: "var(--muted)", fg: "var(--muted-fg)" },
      card: { DEFAULT: "var(--card)", fg: "var(--card-fg)" },
      border: "var(--border)",
      ring: "var(--ring)",
      bone: "var(--bone)",
      cinnabar: { DEFAULT: "var(--cinnabar)", light: "var(--cinnabar-light)", dark: "var(--cinnabar-dark)", ghost: "var(--cinnabar-ghost)" },
      gold: { DEFAULT: "var(--gold)", light: "var(--gold-light)", dark: "var(--gold-dark)", ghost: "var(--gold-ghost)" },
      celadon: { DEFAULT: "var(--celadon)", ghost: "var(--celadon-ghost)" },
      kiln: { DEFAULT: "var(--kiln)", ghost: "var(--kiln-ghost)" },
      ash: { DEFAULT: "var(--ash)", ghost: "var(--ash-ghost)" },
      crimson: { DEFAULT: "var(--crimson)", ghost: "var(--crimson-ghost)" },
      agent: {
        scout: "var(--agent-scout)",
        advocate: "var(--agent-advocate)",
        critic: "var(--agent-critic)",
        arbiter: "var(--agent-arbiter)",
        artist: "var(--agent-artist)",
        smith: "var(--agent-smith)",
        tester: "var(--agent-tester)",
        herald: "var(--agent-herald)",
      },
    },
    fontFamily: { display: "var(--font-display)", body: "var(--font-body)", mono: "var(--font-mono)" },
  },
  shortcuts: {
    "t-fast": "transition-all duration-150 ease",
    "t-base": "transition-all duration-200 ease",
    "t-smooth": "transition-all duration-300 ease-out",
    "t-slow": "transition-all duration-400 ease-out",
  },
})

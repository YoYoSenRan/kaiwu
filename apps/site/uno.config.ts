import { defineConfig, presetWind3 } from "unocss"

export default defineConfig({
  presets: [presetWind3()],
  theme: {
    colors: {
      ink: "var(--ink)",
      paper: "var(--paper)",
      cinnabar: "var(--cinnabar)",
      gold: "var(--gold)",
      celadon: "var(--celadon)",
      kiln: "var(--kiln)",
      ash: "var(--ash)",
      bone: "var(--bone)",
    },
  },
})

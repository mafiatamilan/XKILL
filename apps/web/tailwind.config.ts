import designConfig from "@xkill/design-system/tailwind.config"
import type { Config } from "tailwindcss"

const config: Config = {
  ...designConfig,
  content: ["./src/**/*.{ts,tsx}"],
}

export default config

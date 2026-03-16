import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#eef2ff",
        ocean: "#0f4c81",
        ember: "#ff6f61"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2962FF",
        bg: {
          900: "#040917",
          800: "#071127"
        },
        risk: {
          low: "#00E5FF",
          moderate: "#29B6F6",
          high: "#FFB300",
          severe: "#FF7043",
          critical: "#FF1744"
        }
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "'Sora'", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glass: "0 10px 40px rgba(41, 98, 255, 0.22)",
        glow: "0 0 0 1px rgba(41, 98, 255, 0.4), 0 0 40px rgba(41, 98, 255, 0.24)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(120% 120% at 50% -20%, rgba(41,98,255,0.35), transparent 55%), linear-gradient(165deg, #030611 0%, #07152d 50%, #02040b 100%)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
        marquee: "marquee 22s linear infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" }
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" }
        }
      }
    }
  },
  plugins: []
};

export default config;

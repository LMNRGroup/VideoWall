/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wall: {
          bg: "#0f1115",
          panel: "#1a1d24",
          border: "rgba(255,255,255,0.08)",
          text: "#f5f7fb",
          muted: "#9ba3b4",
          accent: "#d7e7ff",
          success: "#58d68d",
          warning: "#f5c26b",
          danger: "#ff7a7a"
        }
      },
      boxShadow: {
        glow: "0 20px 80px rgba(0, 0, 0, 0.35)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

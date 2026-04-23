import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand:    { DEFAULT: "#2563EB", light: "#60A5FA", dark: "#1D4ED8" },
        success:  { DEFAULT: "#16A34A", light: "#4ADE80" },
        warning:  { DEFAULT: "#F59E0B", light: "#FCD34D" },
        danger:   { DEFAULT: "#DC2626", light: "#F87171" },
        info:     { DEFAULT: "#8B5CF6", light: "#A78BFA" },
        kc:       "#2563EB",  // 知识中心
        pf:       "#8B5CF6",  // 提示词工厂
        oc:       "#F59E0B",  // 编排中心
        gc:       "#16A34A",  // 治理中心
        admin:    "#6B7280",  // 企业后台
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
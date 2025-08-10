export default { content: ["./src/**/*.{html,js,jsx,ts,tsx}"] }

module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: "#FF4E8A",
        secondary: "#8B5CF6",
        glass: "rgba(255,255,255,0.06)",
        accent: "#06b6d4"
      },
      blur: {
        xl: "20px",
      },
      boxShadow: {
        glow: "0 10px 30px rgba(139,92,246,0.12)",
        soft: "0 6px 18px rgba(0,0,0,0.45)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "60%": { transform: "scale(1.05)", opacity: 1 },
          "100%": { transform: "scale(1)" }
        },
        floaty: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
          "100%": { transform: "translateY(0px)" }
        }
      },
      animation: {
        pop: "pop .32s cubic-bezier(.2,.9,.3,1)",
        floaty: "floaty 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

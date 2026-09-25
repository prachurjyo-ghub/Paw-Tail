/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/components/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/pages/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        main: "#173F31",
        mainHover: "#0F2A20",
        mainSoft: "#E6EFEA",
        accent: "#F28C38",
        accentSoft: "#FF9A44",
      },
      width: {
        "7xl": "80rem",
      },
      keyframes: {
        marquee: {
          // Left → right: start one track-width left, slide back to origin.
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0%)" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
      },
    },
  },
  plugins: [],
};

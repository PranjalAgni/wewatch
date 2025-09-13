import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

const config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [forms, typography],
};

export default config;
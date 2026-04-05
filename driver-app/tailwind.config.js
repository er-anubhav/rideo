/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                "primary": "#7311d4",
                "primary-hover": "#560a8c",
                "primary-light": "#A855F7",
                "accent": "#9d4edd",
                "background-light": "#f7f6f8",
                "surface-dark": "#2a2235",
                "joy-purple": "#8B5CF6",
            },
            fontFamily: {
                sans: ["PlusJakartaSans-Regular"],
                display: ["PlusJakartaSans-ExtraBold"],
            },
            boxShadow: {
                'glow': '0 0 40px -10px rgba(157, 78, 221, 0.5)',
            }
        },
    },
    plugins: [],
}

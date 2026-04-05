module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                "primary": "#7311d4",
                "primary-hover": "#560a8c",
                "primary-light": "#A855F7",
                "accent": "#9d4edd",
                "background-light": "#f7f6f8",
                "background-dark": "#191022",
                "surface-dark": "#2a2235",
                "surface-dark-lighter": "#3a3146",
                "surface-active": "#2d2438",
                "sheet-dark": "#12021F",
                "joy-purple": "#8B5CF6",
                "brand-dark": "#18002E",
                "brand-surface": "#240046",
                "brand-accent": "#9D4EDD",
                "brand-light": "#E0AAFF",
                "input-bg": "rgba(255, 255, 255, 0.1)",
            },
            fontFamily: {
                "display": ["PlusJakartaSans_400Regular", "PlusJakartaSans_500Medium", "PlusJakartaSans_700Bold", "PlusJakartaSans_800ExtraBold"],
            },
            boxShadow: {
                'glow': '0 0 40px -10px rgba(157, 78, 221, 0.5)',
            }
        },
    },
    plugins: [],
}

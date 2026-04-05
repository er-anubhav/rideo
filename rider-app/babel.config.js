module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            [
                "module-resolver",
                {
                    root: ["./"],
                    alias: {
                        "@/App": "./App",
                        "@": "./src",
                    },
                },
            ],
            "react-native-reanimated/plugin",
        ],
    };
};

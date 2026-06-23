import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
    plugins: [react()],
    test: {
        setupFiles: ["src/testSetup.ts"],
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                {
                    browser: "chromium",
                },
            ],
        },
        include: ["src/**/*.test.ts?(x)"],
    },
    build: {
        minify: false,
        outDir: "dist",
        lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: "index",
        },
        rollupOptions: {
            external: [
                /^react(\/.*)?$/,
                /^react-dom(\/.*)?$/,
                "@collagejs/core",
            ],
        },
    }
});

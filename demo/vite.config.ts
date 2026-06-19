import vue from "@vitejs/plugin-vue";
import { transform as esbuildTransform } from "esbuild";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "ts-decorator-transform",
      async transform(code, id) {
        if (!id.endsWith(".ts") && !id.endsWith(".mts") && !id.endsWith(".cts")) return null;
        const result = await esbuildTransform(code, { loader: "ts", target: "es2022" });
        return { code: result.code, map: result.map };
      },
    },
  ],
  oxc: false,
  esbuild: false,
});

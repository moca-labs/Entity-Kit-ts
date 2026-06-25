import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { entityKitPlugin } from "../../src/vite";

export default defineConfig({
  plugins: [entityKitPlugin(), vue()],
});

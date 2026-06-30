import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { entityKitPlugin } from "../dist/vite.js";

export default defineConfig({
  plugins: [entityKitPlugin(), vue()],
});

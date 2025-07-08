import { sveltekit } from "@sveltejs/kit/vite";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const blob: Plugin = {
  name: "blob",
  transform(_, id) {
    const match = /^(.*)\?(.*)$/.exec(id);
    if (match === null) {
      return;
    }
    if (match.length !== 3) {
      throw new Error();
    }
    const [, path, query] = match;

    if (query !== "blob") {
      return;
    }
    const data = readFileSync(path);
    const bytes = Array.from(data)
      .map((b) => b.toString())
      .join(",");
    return `export default Object.freeze(new Blob([new Uint8Array([${bytes}])]))`;
  },
};

export default defineConfig({
  plugins: [sveltekit(), blob],
});

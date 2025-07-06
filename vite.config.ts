import { sveltekit } from "@sveltejs/kit/vite";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const base64: Plugin = {
  name: "base64",
  transform(_, id) {
    const match = /^(.*)\?(.*)$/.exec(id);
    if (match === null) {
      return;
    }
    if (match.length !== 3) {
      throw new Error();
    }
    const [, path, query] = match;

    if (query !== "base64") {
      return;
    }
    const data = readFileSync(path);
    const base64 = data.toString("base64");

    return `export default "${base64}"`;
  },
};

export default defineConfig({
  plugins: [sveltekit(), base64],
});

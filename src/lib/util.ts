export function assert(b: boolean): asserts b {
  if (!b) {
    throw new Error("assertion failed");
  }
}

export function stripPrefix(s: string, prefix: string): string | undefined {
  if (s.startsWith(prefix)) {
    return s.substring(prefix.length);
  }
}

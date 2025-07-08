export function assert(b: boolean): asserts b {
  if (!b) {
    throw new Error("assertion failed");
  }
}

export function unreachable(_: never): never {
  throw new Error("should be unreachable");
}

export function parseNumber(s: string): number | undefined {
  const x = parseFloat(s);
  if (!isNaN(x)) {
    return x;
  }
}

export function stripPrefix(s: string, prefix: string): string | undefined {
  if (s.startsWith(prefix)) {
    return s.substring(prefix.length);
  }
}

export function getBasename(s: string): string {
  const match = /^(.*)\..*$/.exec(s);
  if (match === null) {
    return s;
  }
  assert(match.length === 2);
  return match[1];
}

export function splitFilename(filename: string): [string, string] {
  if (filename.startsWith(".")) {
    return [filename, ""];
  }
  const match = /^(.*)\.(.*)$/.exec(filename);
  if (match === null) {
    return [filename, ""];
  }
  assert(match.length === 3);
  const [, stem, ext] = match;
  return [stem, ext];
}

export function* dedupe<T>(ts: Iterable<T>): Generator<T, void, void> {
  let lastT: T | undefined;
  for (const t of ts) {
    if (lastT === undefined || lastT !== t) {
      yield t;
    }
  }
}

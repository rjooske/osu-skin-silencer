import silenceOgg from "./silence.ogg?base64";
import { assert, parseNumber, splitFilename, stripPrefix } from "./util";
import {
  BlobReader,
  BlobWriter,
  TextWriter,
  ZipReader,
  ZipWriter,
  type Entry,
} from "@zip.js/zip.js";

function base64ToArrayBuffer(base64: string): ArrayBuffer | undefined {
  let bytesString: string;
  try {
    bytesString = atob(base64);
  } catch {
    return;
  }
  const arrayBuffer = new ArrayBuffer(bytesString.length);
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytesString.length; i++) {
    bytes[i] = bytesString.charCodeAt(i);
  }
  return arrayBuffer;
}

const SILENCE_OGG_BLOB = (() => {
  const arrayBuffer = base64ToArrayBuffer(silenceOgg);
  assert(arrayBuffer !== undefined);
  return new Blob([arrayBuffer]);
})();

declare const nominalIdentifier: unique symbol;
type Nominal<T, Identifier> = T & { [nominalIdentifier]: Identifier };

export type Sound = Nominal<string, "Sound">;

export const CONST_SOUNDS = Object.freeze([
  "heartbeat",
  "seeya",
  "welcome",
  "key-confirm",
  "key-delete",
  "key-movement",
  "key-press-1",
  "key-press-2",
  "key-press-3",
  "key-press-4",
  "back-button-click",
  "check-on",
  "check-off",
  "click-close",
  "click-short-confirm",
  "menuback",
  "menuhit",
  "menu-back-click",
  "menu-direct-click",
  "menu-edit-click",
  "menu-exit-click",
  "menu-freeplay-click",
  "menu-multiplayer-click",
  "menu-options-click",
  "menu-play-click",
  "pause-back-click",
  "pause-continue-click",
  "pause-retry-click",
  "select-expand",
  "select-difficulty",
  "shutter",
  "back-button-hover",
  "click-short",
  "menuclick",
  "menu-back-hover",
  "menu-direct-hover",
  "menu-edit-hover",
  "menu-exit-hover",
  "menu-freeplay-hover",
  "menu-multiplayer-hover",
  "menu-options-hover",
  "menu-play-hover",
  "pause-hover",
  "pause-back-hover",
  "pause-continue-hover",
  "pause-retry-hover",
  "sliderbar",
  "whoosh",
  "match-confirm",
  "match-join",
  "match-leave",
  "match-notready",
  "match-ready",
  "match-start",
  "metronomelow",
  "count",
  "count1s",
  "count2s",
  "count3s",
  "gos",
  "readys",
  "comboburst",
  "combobreak",
  "failsound",
  "sectionpass",
  "sectionfail",
  "applause",
  "pause-loop",
  "drum-hitnormal",
  "drum-hitclap",
  "drum-hitfinish",
  "drum-hitwhistle",
  "drum-slidertick",
  "drum-sliderslide",
  "drum-sliderwhistle",
  "normal-hitnormal",
  "normal-hitclap",
  "normal-hitfinish",
  "normal-hitwhistle",
  "normal-slidertick",
  "normal-sliderslide",
  "normal-sliderwhistle",
  "soft-hitnormal",
  "soft-hitclap",
  "soft-hitfinish",
  "soft-hitwhistle",
  "soft-slidertick",
  "soft-sliderslide",
  "soft-sliderwhistle",
  "spinnerspin",
  "spinnerbonus",
  "spinnerbonus-max",
  "nightcore-kick",
  "nightcore-clap",
  "nightcore-hat",
  "nightcore-finish",
  "taiko-normal-hitnormal",
  "taiko-normal-hitclap",
  "taiko-normal-hitfinish",
  "taiko-normal-hitwhistle",
  "taiko-soft-hitnormal",
  "taiko-soft-hitclap",
  "taiko-soft-hitfinish",
  "taiko-soft-hitwhistle",
  "taiko-drum-hitnormal",
  "taiko-drum-hitclap",
  "taiko-drum-hitfinish",
  "taiko-drum-hitwhistle",
] as Sound[]);

export const HITSOUND_SET = Object.freeze(
  new Set([
    "drum-hitnormal",
    "drum-hitclap",
    "drum-hitfinish",
    "drum-hitwhistle",
    "drum-slidertick",
    "drum-sliderslide",
    "drum-sliderwhistle",
    "normal-hitnormal",
    "normal-hitclap",
    "normal-hitfinish",
    "normal-hitwhistle",
    "normal-slidertick",
    "normal-sliderslide",
    "normal-sliderwhistle",
    "soft-hitnormal",
    "soft-hitclap",
    "soft-hitfinish",
    "soft-hitwhistle",
    "soft-slidertick",
    "soft-sliderslide",
    "soft-sliderwhistle",
  ] as Sound[]),
);

export const TAIKO_HITSOUND_SET = Object.freeze(
  new Set([
    "taiko-normal-hitnormal",
    "taiko-normal-hitclap",
    "taiko-normal-hitfinish",
    "taiko-normal-hitwhistle",
    "taiko-soft-hitnormal",
    "taiko-soft-hitclap",
    "taiko-soft-hitfinish",
    "taiko-soft-hitwhistle",
    "taiko-drum-hitnormal",
    "taiko-drum-hitclap",
    "taiko-drum-hitfinish",
    "taiko-drum-hitwhistle",
  ] as Sound[]),
);

const SOUND_TO_INDEX = (() => {
  const m = new Map<Sound, number>();
  for (let i = 0; i < CONST_SOUNDS.length; i++) {
    m.set(CONST_SOUNDS[i], i);
  }
  return m;
})();

const COMBOBURST = (() => {
  const s = "comboburst";
  assert(isSound(s));
  return s;
})();

const COMBOBURST_INDEX = (() => {
  const i = SOUND_TO_INDEX.get(COMBOBURST);
  assert(i !== undefined);
  return i;
})();

function isSound(s: string): s is Sound {
  return SOUND_TO_INDEX.has(s as Sound) || /^comboburst-\d+$/.test(s);
}

function comboBurstNumber(s: Sound): number | undefined {
  const digits = stripPrefix(s, "comboburst-");
  if (digits === undefined) {
    return;
  }
  const n = parseNumber(digits);
  assert(n !== undefined);
  return n;
}

function compareSounds(a: Sound, b: Sound): number {
  let ai = SOUND_TO_INDEX.get(a);
  let bi = SOUND_TO_INDEX.get(b);
  if (ai === undefined) {
    if (bi === undefined) {
      const an = comboBurstNumber(a);
      const bn = comboBurstNumber(b);
      assert(an !== undefined && bn !== undefined);
      return an - bn;
    } else {
      return COMBOBURST_INDEX - bi;
    }
  } else {
    if (bi === undefined) {
      return ai - COMBOBURST_INDEX;
    } else {
      return ai - bi;
    }
  }
}

function filenameToSound(filename: string): Sound | undefined {
  if (filename.includes("/")) {
    return;
  }
  const [stem, ext] = splitFilename(filename);
  if (!((ext === "wav" || ext === "mp3" || ext === "ogg") && isSound(stem))) {
    return;
  }
  return stem;
}

function soundToOggFilename(s: Sound): string {
  return s + ".ogg";
}

const KNOWN_SKIN_VERSIONS = Object.freeze([
  "1.0",
  "2.0",
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5",
  "2.6",
  "2.7",
]);
export const LATEST_KNOWN_SKIN_VERSION =
  KNOWN_SKIN_VERSIONS[KNOWN_SKIN_VERSIONS.length - 1];

function findSkinVersion(skinIni: string): string | undefined {
  const match = /^\s*Version\s*:(.*)$/m.exec(skinIni);
  if (match === null) {
    return;
  }
  assert(match.length === 2);
  return match[1].trim();
}

export type SkinFile = {
  name: string;
  content: Blob;
};

export type SkinDirectory = {
  name: string;
};

export type Skin = {
  soundFiles: Map<Sound, SkinFile>;
  files: SkinFile[];
  directories: SkinDirectory[];
};

export function getSortedSounds(skin: Skin): Sound[] {
  const removeUnnumberedComboburst = skin.soundFiles
    .keys()
    .some((s) => comboBurstNumber(s) !== undefined);
  const sounds = [...CONST_SOUNDS, ...skin.soundFiles.keys()];
  if (removeUnnumberedComboburst) {
    sounds.splice(COMBOBURST_INDEX, 1);
  }
  sounds.sort((a, b) => compareSounds(a, b));
  return sounds;
}

export type ParseSkinWarning =
  | { kind: "no-skin-ini" }
  | { kind: "version-latest" }
  | { kind: "version-unknown"; version: string };

export type ParseSkinError =
  | { kind: "cannot-unzip"; thrown: unknown }
  | { kind: "cannot-unzip-entry"; thrown: unknown; filename: string };

export type ParseSkinResult =
  | { kind: "ok"; skin: Skin; warning: ParseSkinWarning | undefined }
  | { kind: "err"; error: ParseSkinError };

export async function parseSkin(
  arrayBuffer: ArrayBuffer,
): Promise<ParseSkinResult> {
  const reader = new ZipReader(new BlobReader(new Blob([arrayBuffer])));
  let entries: Entry[];
  try {
    entries = await reader.getEntries();
  } catch (thrown) {
    return { kind: "err", error: { kind: "cannot-unzip", thrown } };
  } finally {
    await reader.close();
  }

  const soundFiles = new Map<Sound, SkinFile>();
  const files: SkinFile[] = [];
  const directories: SkinDirectory[] = [];
  for (const e of entries) {
    if (e.directory) {
      directories.push({ name: e.filename });
    } else {
      assert(e.getData !== undefined);
      let content: Blob;
      try {
        content = await e.getData(new BlobWriter());
      } catch (thrown) {
        return {
          kind: "err",
          error: { kind: "cannot-unzip-entry", thrown, filename: e.filename },
        };
      }
      const file = { name: e.filename, content };
      const sound = filenameToSound(e.filename);
      if (sound !== undefined) {
        soundFiles.set(sound, file);
      } else {
        files.push(file);
      }
    }
  }

  let warning: ParseSkinWarning | undefined;
  const skinIniEntry = entries.find((e) => e.filename === "skin.ini");
  if (skinIniEntry !== undefined && !skinIniEntry.directory) {
    assert(skinIniEntry.getData !== undefined);
    const skinIni = await skinIniEntry.getData(new TextWriter());
    const version = findSkinVersion(skinIni) ?? "1.0";
    if (version === "latest") {
      warning = { kind: "version-latest" };
    } else if (!KNOWN_SKIN_VERSIONS.includes(version)) {
      warning = { kind: "version-unknown", version };
    }
  } else {
    warning = { kind: "no-skin-ini" };
  }

  return { kind: "ok", skin: { soundFiles, files, directories }, warning };
}

export async function silence(
  skin: Skin,
  soundsToSilence: Set<Sound>,
): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter());

  for (const [sound, f] of skin.soundFiles.entries()) {
    if (!soundsToSilence.has(sound)) {
      await writer.add(f.name, new BlobReader(f.content));
    }
  }
  for (const s of soundsToSilence) {
    await writer.add(soundToOggFilename(s), new BlobReader(SILENCE_OGG_BLOB));
  }

  for (const f of skin.files) {
    await writer.add(f.name, new BlobReader(f.content));
  }
  for (const d of skin.directories) {
    await writer.add(d.name, undefined, { directory: true });
  }

  return await writer.close();
}

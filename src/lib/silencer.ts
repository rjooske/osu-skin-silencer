import silenceOgg from "./silence.ogg?base64";
import { assert, stripPrefix } from "./util";
import {
  BlobReader,
  BlobWriter,
  ZipReader,
  ZipWriter,
  type Entry,
  type ZipWriterAddDataOptions,
} from "@zip.js/zip.js";

export const SOUNDS = [
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
] as const;
type Sound = (typeof SOUNDS)[number];

export const MANIA_SOUND_INDICES = (() => {
  const maniaSoundSet = new Set<Sound>([
    "comboburst",
    "combobreak",
    "failsound",
    "sectionpass",
    "sectionfail",
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
    "nightcore-kick",
    "nightcore-clap",
    "nightcore-hat",
    "nightcore-finish",
  ]);

  const is: number[] = [];
  for (let i = 0; i < SOUNDS.length; i++) {
    if (maniaSoundSet.has(SOUNDS[i])) {
      is.push(i);
    }
  }
  return Object.freeze(is);
})();

function findSkinVersion(skinIni: string): string | undefined {
  const match = /^\s*Version\s*:(.*)$/m.exec(skinIni);
  if (match === null) {
    return;
  }
  assert(match.length === 2);
  return match[1].trim();
}

function filenameMatchesSound(filename: string, sound: Sound): boolean {
  const rest = stripPrefix(filename, sound);
  if (rest === undefined) {
    return false;
  }
  return /^\.(wav|mp3|ogg)$/.test(rest);
}

function entryToAddOptions(e: Entry): ZipWriterAddDataOptions {
  return {
    comment: e.comment,
    creationDate: e.creationDate,
    directory: e.directory,
    externalFileAttribute: e.externalFileAttribute,
    extraField: e.extraField,
    internalFileAttribute: e.internalFileAttribute,
    lastAccessDate: e.lastAccessDate,
    lastModDate: e.lastModDate,
    msDosCompatible: e.msDosCompatible,
    version: e.version,
    zip64: e.zip64,
  };
}

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

type SilenceError =
  | { kind: "cannot-unzip"; thrown: unknown }
  | { kind: "cannot-unzip-entry"; thrown: unknown; filename: string };

type SilenceResult =
  | { kind: "ok"; silencedSkin: Blob }
  | { kind: "err"; error: SilenceError };

export async function silence(
  skin: ArrayBuffer,
  sounds: Sound[],
): Promise<SilenceResult> {
  const reader = new ZipReader(new BlobReader(new Blob([skin])));
  const writer = new ZipWriter(new BlobWriter());

  let entries: Entry[];
  try {
    entries = await reader.getEntries();
  } catch (thrown) {
    return { kind: "err", error: { kind: "cannot-unzip", thrown } };
  } finally {
    await reader.close();
  }

  // TODO: comboburst

  for (const s of sounds) {
    await writer.add(s + ".ogg", new BlobReader(SILENCE_OGG_BLOB));
  }

  for (const e of entries) {
    if (sounds.some((s) => filenameMatchesSound(e.filename, s))) {
      continue;
    }

    const options = entryToAddOptions(e);
    if (e.directory) {
      await writer.add(e.filename, undefined, options);
    } else {
      assert(e.getData !== undefined);
      let blob: Blob;
      try {
        blob = await e.getData(new BlobWriter());
      } catch (thrown) {
        return {
          kind: "err",
          error: { kind: "cannot-unzip-entry", thrown, filename: e.filename },
        };
      }
      await writer.add(e.filename, new BlobReader(blob), options);
    }
  }

  return { kind: "ok", silencedSkin: await writer.close() };
}

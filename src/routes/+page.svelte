<script lang="ts">
  import {
    CONST_SOUNDS,
    getSortedSounds,
    HITSOUND_SET,
    LATEST_KNOWN_SKIN_VERSION,
    parseSkin,
    silence,
    TAIKO_HITSOUND_SET,
    type ParseSkinError,
    type ParseSkinWarning,
    type Skin,
    type Sound,
  } from "$lib/silencer";
  import { assert, splitFilename, unreachable } from "$lib/util";

  type AppNoSkinError =
    | { kind: "cannot-read-file"; thrown: unknown; filename: string }
    | ParseSkinError;

  type App =
    | {
        state: "no-skin";
        error: AppNoSkinError | undefined;
      }
    | {
        state: "skin-imported";
        skin: Skin;
        skinName: string;
        warning: ParseSkinWarning | undefined;
        soundSelections: [Sound, boolean][];
      };

  let app = $state<App>({ state: "no-skin", error: undefined });
  let silencing = $state(false);

  let fileInput = $state<HTMLInputElement | undefined>();
  $effect(() => {
    if (fileInput !== undefined) {
      fileInput.value = "";
    }
  });

  function handleSelectAll() {
    assert(app.state === "skin-imported");
    app.soundSelections = app.soundSelections.map(([s]) => [s, true]);
  }

  function handleDeselectAll() {
    assert(app.state === "skin-imported");
    app.soundSelections = app.soundSelections.map(([s]) => [s, false]);
  }

  function handleSelectHitsounds() {
    assert(app.state === "skin-imported");
    app.soundSelections = app.soundSelections.map(([s, b]) => {
      if (HITSOUND_SET.has(s)) {
        return [s, true];
      } else {
        return [s, b];
      }
    });
  }

  function handleSelectTaikoHitsounds() {
    assert(app.state === "skin-imported");
    app.soundSelections = app.soundSelections.map(([s, b]) => {
      if (TAIKO_HITSOUND_SET.has(s)) {
        return [s, true];
      } else {
        return [s, b];
      }
    });
  }

  function downloadBlob(b: Blob, filename: string) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(b);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSkinFileChange(file: File | undefined) {
    async function f(file: File | undefined): Promise<App> {
      if (file === undefined) {
        return { state: "no-skin", error: undefined };
      }

      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch (thrown) {
        return {
          state: "no-skin",
          error: { kind: "cannot-read-file", thrown, filename: file.name },
        };
      }

      const result = await parseSkin(arrayBuffer);
      if (result.kind === "err") {
        return { state: "no-skin", error: result.error };
      }

      return {
        state: "skin-imported",
        skin: result.skin,
        skinName: splitFilename(file.name)[0],
        warning: result.warning,
        soundSelections: getSortedSounds(result.skin).map((s) => [s, false]),
      };
    }

    app = await f(file);
  }

  async function handleExport() {
    assert(app.state === "skin-imported");

    const soundsToSilence = new Set(
      app.soundSelections.filter(([, b]) => b).map(([s]) => s),
    );
    silencing = true;
    const silencedSkin = await silence(app.skin, soundsToSilence);
    silencing = false;

    downloadBlob(silencedSkin, `${app.skinName} (silenced).osk`);
  }
</script>

{#snippet showParseSkinError(e: AppNoSkinError)}
  {#if e.kind === "cannot-read-file"}
    Failed to read the imported file <code>{e.filename}</code>:
    <code>{e.thrown}</code>
  {:else if e.kind === "cannot-unzip"}
    Failed to unzip the imported skin: <code>{e.thrown}</code>
  {:else if e.kind === "cannot-unzip-entry"}
    Failed to unzip the entry <code>{e.filename}</code> in the imported skin:
    <code>{e.thrown}</code>
  {:else}
    {unreachable(e)}
  {/if}
{/snippet}

{#snippet showParseSkinWarning(w: ParseSkinWarning)}
  {@const latest = "https://osu.ppy.sh/wiki/en/Skinning/skin.ini#latest"}
  {@const general = "https://osu.ppy.sh/wiki/en/Skinning/skin.ini#[general]"}
  {#if w.kind === "no-skin-ini"}
    There is no <code>skin.ini</code> file in the imported skin, so the skin
    version is <a href={general} target="_blank">assumed</a> to be
    <a href={latest} target="_blank"><code>latest</code></a>. Since the latest
    skin version known to this tool is <code>{LATEST_KNOWN_SKIN_VERSION}</code>,
    if the actual latest skin version is newer than
    <code>{LATEST_KNOWN_SKIN_VERSION}</code>, this tool may not work correctly.
  {:else if w.kind === "version-latest"}
    <code>skin.ini</code> specifies the skin version as
    <a href={latest} target="_blank"><code>latest</code></a>, and the latest
    skin version known to this tool is
    <code>{LATEST_KNOWN_SKIN_VERSION}</code>. If the actual latest skin version
    is newer than <code>{LATEST_KNOWN_SKIN_VERSION}</code>, this tool may not
    work correctly.
  {:else if w.kind === "version-unknown"}
    <code>skin.ini</code> specifies the skin version as
    <code>{w.version}</code>, which is unknown to this tool so it may not work
    correctly.
  {:else}
    {unreachable(w)}
  {/if}
{/snippet}

<h1><img src="speak_no_evil.svg" alt=":speak_no_evil:" /> Osu skin silencer</h1>

<p style="margin-bottom: 2em;">
  Osu skin silencer lets you turn off specific sound effects in osu by skinning
  them with a very short silent audio file. This is especially useful when you
  don't want hitsounds (you probably play mania) but also don't want to miss out
  on all the other sound effects. Simply import your skin file, select sound
  effects to turn off, and export the silenced skin. You can finally turn your
  effect volume back on!
</p>

<fieldset>
  <legend>Import</legend>
  <p>
    Select a <code>.osk</code> or <code>.zip</code> file:
    <input
      bind:this={fileInput}
      type="file"
      accept=".osk,.zip"
      onchange={(e) => {
        const files = e.currentTarget.files;
        assert(files !== null);
        handleSkinFileChange(files[0]);
      }}
    />
  </p>
  {#if app.state === "no-skin" && app.error !== undefined}
    <p class="error">{@render showParseSkinError(app.error)}</p>
  {/if}
  {#if app.state === "skin-imported" && app.warning !== undefined}
    <p class="warning">{@render showParseSkinWarning(app.warning)}</p>
  {/if}
</fieldset>

<fieldset disabled={app.state !== "skin-imported"}>
  <legend>Edit</legend>
  <p>
    Select sounds to silence. Each sound is explained <a
      href="https://osu.ppy.sh/wiki/en/Skinning/Sounds"
      target="_blank"
    >
      here
    </a>.
  </p>
  <p>
    <button onclick={handleSelectAll}>Select all</button>
    <button onclick={handleDeselectAll}>Deselect all</button>
    <button onclick={handleSelectHitsounds}>Select hitsounds</button>
    <button onclick={handleSelectTaikoHitsounds}>Select taiko hitsounds</button>
  </p>
  <ul class="sounds">
    {#if app.state === "skin-imported"}
      {#each app.soundSelections as [s], i}
        <li>
          <label>
            <input type="checkbox" bind:checked={app.soundSelections[i][1]} />
            <span>{s}</span>
          </label>
        </li>
      {/each}
    {:else}
      {#each CONST_SOUNDS as s}
        <li>
          <label>
            <input type="checkbox" />
            <span>{s}</span>
          </label>
        </li>
      {/each}
    {/if}
  </ul>
</fieldset>

<fieldset disabled={app.state !== "skin-imported"}>
  <legend>Export</legend>
  <p>
    <button disabled={silencing} onclick={handleExport}>
      {silencing ? "Exporting..." : "Export silenced skin"}
    </button>
  </p>
</fieldset>

<footer>
  <nav>
    <ul>
      <li>
        <a href="https://github.com/rjooske/osu-skin-silencer" target="_blank">
          Repository
        </a>
      </li>
      <li>
        <a
          href="https://github.com/rjooske/osu-skin-silencer/issues"
          target="_blank"
        >
          Report an issue
        </a>
      </li>
    </ul>
  </nav>
</footer>

<style lang="scss">
  :global {
    body {
      font-family: sans-serif;
      margin: 1em auto;
      max-width: min(60em, 95vw);
      container-type: size;

      &::after {
        content: "";
        display: block;
        height: 50vh;
      }
    }
  }

  h1 > img {
    height: 1.5em;
    vertical-align: middle;
    margin-top: -0.4em;
  }

  fieldset {
    margin: 1em 0;

    &:disabled {
      opacity: 0.5;
    }
  }

  p.error {
    padding: 1em;
    background-color: oklch(0.98 0.05 30);
    border: 1px solid oklch(0.98 0.1 30);

    &::before {
      content: "❌";
      margin-right: 1ch;
    }
  }

  p.warning {
    padding: 1em;
    background-color: oklch(0.98 0.05 90);
    border: 1px solid oklch(0.98 0.1 90);

    &::before {
      content: "⚠️";
      margin-right: 1ch;
    }
  }

  ul.sounds {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    list-style: none;
    padding-left: 0;

    @container (width < 50em) {
      grid-template-columns: repeat(2, 1fr);
    }

    @container (width < 35em) {
      grid-template-columns: 1fr;
    }

    & span {
      font-family: monospace;
    }
  }

  footer {
    margin-top: 3em;
    text-align: right;

    & ul {
      list-style: none;
      padding-left: 0;
      line-height: 1.5em;
    }
  }
</style>

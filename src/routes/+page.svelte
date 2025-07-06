<script lang="ts">
  import { MANIA_SOUND_INDICES, silence, SOUNDS } from "$lib/silencer";
  import { assert } from "$lib/util";

  let skinFile = $state<File | undefined>();
  let willSilence = $state(SOUNDS.map(() => false));
  let silencing = $state(false);

  function setWillSilenceAll(b: boolean) {
    willSilence = SOUNDS.map(() => b);
  }

  function setWillSilenceManiaRelated(b: boolean) {
    const newWillSilence = Array.from(willSilence);
    for (const i of MANIA_SOUND_INDICES) {
      newWillSilence[i] = b;
    }
    willSilence = newWillSilence;
  }

  function downloadBlob(b: Blob, filename: string) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(b);
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    function basename(s: string): string {
      const match = /^(.*)\..*$/.exec(s);
      if (match === null) {
        return s;
      }
      assert(match.length === 2);
      return match[1];
    }

    assert(skinFile !== undefined);

    let skin: ArrayBuffer;
    try {
      skin = await skinFile.arrayBuffer();
    } catch (e) {
      console.error(e);
      alert("Cannot read the imported file.");
      return;
    }

    silencing = true;
    const maybeSilencedSkin = await silence(
      skin,
      SOUNDS.filter((_, i) => willSilence[i]),
    );
    silencing = false;

    if (maybeSilencedSkin.kind === "err") {
      // TODO
      return;
    }
    const { silencedSkin } = maybeSilencedSkin;

    downloadBlob(silencedSkin, `${basename(skinFile.name)} (silenced).osk`);
  }
</script>

<h1>Osu skin silencer</h1>

<fieldset>
  <legend>Import/Export</legend>
  <p>
    Import a <code>.osk</code> or <code>.zip</code> file:
    <input
      type="file"
      accept=".osk,.zip"
      value={undefined}
      onchange={(e) => {
        const files = e.currentTarget.files;
        assert(files !== null);
        if (files.length === 0) {
          skinFile = undefined;
        } else {
          skinFile = files[0];
        }
      }}
    />
  </p>
  <p>
    <button
      disabled={skinFile === undefined || silencing}
      onclick={handleExport}
    >
      {silencing ? "Exporting..." : "Export silenced skin"}
    </button>
  </p>
</fieldset>

<fieldset disabled={skinFile === undefined}>
  <legend>Sounds</legend>
  <p>
    Select sounds to silence. Each sound is explained <a
      href="https://osu.ppy.sh/wiki/en/Skinning/Sounds">here</a
    >.
  </p>
  <p>
    <button onclick={() => setWillSilenceAll(true)}>Select all</button>
    <button onclick={() => setWillSilenceAll(false)}>Deselect all</button>
    <button onclick={() => setWillSilenceManiaRelated(true)}>
      Select mania related
    </button>
    <button onclick={() => setWillSilenceManiaRelated(false)}>
      Deselect mania related
    </button>
  </p>
  <ul class="sounds">
    {#each SOUNDS as s, i}
      <li>
        <label>
          <input type="checkbox" bind:checked={willSilence[i]} />
          <span>{s}</span>
        </label>
      </li>
    {/each}
  </ul>
</fieldset>

<style lang="scss">
  :global {
    body {
      font-family: sans-serif;
      margin: 0 auto;
      max-width: min(60em, 95vw);
      container-type: size;

      &::after {
        content: "";
        display: block;
        height: 50vh;
      }
    }
  }

  fieldset {
    margin: 1em 0;

    &:disabled {
      opacity: 0.5;
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
</style>

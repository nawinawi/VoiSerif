import "./Editor.scss";

import { Component, createEffect, createSignal, Show } from "solid-js";
import { AppFileDragDrop } from "../components/AppFileDragDrop";
import { DownloadIcon, XIcon } from "../components/Icons";
import { TsmlEditor } from "../components/TsmlEditor";
import { UtteranceList } from "../components/UtteranceList";
import { downloadBinaryAsFile } from "../feature/File";
import { TstprjSignal, TstprjTsmlSignal } from "../feature/TstprjSignal";
import css from "./Editor.module.scss";

const EditorPage: Component = () => {
  const [file, setFile] = createSignal<File | undefined>(undefined);
  const [tstprj, setTstprj] = createSignal<TstprjSignal | undefined>(undefined);
  const [isParsed, setIsParsed] = createSignal(false);
  const [tsml, setTsml] = createSignal<TstprjTsmlSignal | undefined>(undefined);

  const clearFile = () => {
    if (!confirm("保存していないデータは失われます。\nよろしいですか？"))
      return;
    setFile(undefined);
    setTstprj(undefined);
    setIsParsed(false);
    setTsml(undefined);
  };

  const saveFile = async () => {
    downloadBinaryAsFile(await tstprj().serialize(), file().name);
  };

  createEffect(async () => {
    if (file()) {
      setIsParsed(false);
      setTstprj(new TstprjSignal(file()));
      setIsParsed(await tstprj().parse());
    }
  });

  return (
    <main>
      <Show when={!tstprj()}>
        <AppFileDragDrop accept={".tstprj"} setFile={setFile} />
      </Show>
      <Show when={tstprj() && file()}>
        <div class={css.fileBox}>
          <div class={css.iconButton} onClick={saveFile}>
            <DownloadIcon class={css.downloadIcon} />
          </div>
          <div class={css.iconButton} onClick={clearFile}>
            <XIcon class={css.clearIcon} />
          </div>
          <div class={css.fileName}>{file().name}</div>
        </div>
      </Show>
      <Show when={tstprj() && isParsed()}>
        <UtteranceList
          class={css.utteranceList}
          tstprj={tstprj()}
          setTsml={setTsml}
        />
      </Show>
      <Show when={tsml()}>
        <TsmlEditor tsml={tsml()} />
      </Show>
    </main>
  );
};

export default EditorPage;

import { createEffect, createSignal, Show } from "solid-js";
import { AppFileDragDrop } from "../components/AppFileDragDrop";
import { XIcon } from "../components/Icons";
import { TimingFitter } from "../components/TimingFitter";
import { downloadBinaryAsFile, readFileAsText } from "../feature/File";
import { Tstprj } from "../feature/TstprjBase";
import css from "./Fitter.module.scss";

const FitterPage = () => {
  const [tstprjFile, setTstprjFile] = createSignal<File | undefined>(undefined);
  const [ccsFile, setCcsFile] = createSignal<File | undefined>(undefined);
  const [tstprj, setTstprj] = createSignal<Tstprj | undefined>(undefined);
  const [ccs, setCcs] = createSignal<Document | undefined>(undefined);
  const [isTstprjParsed, setIsTstprjParsed] = createSignal(false);
  const [isCcsParsed, setIsCcsParsed] = createSignal(false);

  const clearTstprjFile = () => {
    setTstprjFile(undefined);
    setTstprj(undefined);
    setIsTstprjParsed(false);
  };

  const clearCcsFile = () => {
    setCcsFile(undefined);
    setCcs(undefined);
    setIsCcsParsed(false);
  };

  const saveFile = async () => {
    downloadBinaryAsFile(await tstprj().serialize(), tstprjFile().name);
  };

  createEffect(async () => {
    if (tstprjFile()) {
      setIsTstprjParsed(false);
      setTstprj(new Tstprj(tstprjFile()));
      setIsTstprjParsed(await tstprj().parse());
    }
  });

  createEffect(async () => {
    if (ccsFile()) {
      setIsCcsParsed(false);
      try {
        const xmlText = await readFileAsText(ccsFile());
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "application/xml");
        setCcs(xml);
        setIsCcsParsed(true);
      } catch {
        return;
      }
    }
  });

  return (
    <main>
      <div class={css.fileContainer}>
        <Show when={!tstprj()}>
          <AppFileDragDrop accept={".tstprj"} setFile={setTstprjFile}>
            .tstprjファイルをドラッグ＆ドロップ
          </AppFileDragDrop>
        </Show>
        <Show when={tstprj() && tstprjFile()}>
          <div class={css.fileBox}>
            <div class={css.iconButton} onClick={clearTstprjFile}>
              <XIcon class={css.clearIcon} />
            </div>
            <div class={css.fileName}>{tstprjFile().name}</div>
          </div>
        </Show>
        <Show when={!ccsFile()}>
          <AppFileDragDrop accept={".ccs"} setFile={setCcsFile}>
            .ccsファイルをドラッグ＆ドロップ
          </AppFileDragDrop>
        </Show>
        <Show when={ccs() && ccsFile()}>
          <div class={css.fileBox}>
            <div class={css.iconButton} onClick={clearCcsFile}>
              <XIcon class={css.clearIcon} />
            </div>
            <div class={css.fileName}>{ccsFile().name}</div>
          </div>
        </Show>
      </div>
      <Show when={isTstprjParsed() && isCcsParsed()}>
        <TimingFitter
          filename={tstprjFile().name}
          tstprj={tstprj()}
          ccs={ccs()}
        />
      </Show>
    </main>
  );
};

export default FitterPage;

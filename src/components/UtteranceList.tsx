import { createMemo, createSignal, For } from "solid-js";
import { TstprjSignal, TstprjTsmlSignal } from "../feature/TstprjSignal";
import css from "./UtteranceList.module.scss";

type UtteranceListProps = {
  class?: string;
  tstprj: TstprjSignal;
  setTsml: (tsml: TstprjTsmlSignal) => void;
};

export const UtteranceList = (props: UtteranceListProps) => {
  const [index, setIndex] = createSignal(-1);
  const utterances = createMemo(() =>
    props.tstprj.getElementsByKeyPath("Tracks.Track.Contents.Utterance")
  );
  const list = createMemo(() => {
    return utterances().map((u) => {
      const track = u.parent.parent.getAttributesByKeyPath("name");
      const voice = u.parent.parent.getAttributesByKeyPath("Voice.speaker");
      const text = u.getAttributesByKeyPath("text");

      return {
        track: track.length > 0 ? (track[0].value as string) : "",
        voice: voice.length > 0 ? (voice[0].value as string) : "",
        text: text.length > 0 ? (text[0].value as string) : "",
      };
    });
  });

  const updateIndex = async (i: number) => {
    setIndex(i);
    if (index() < 0) return;
    const tsmlArray = utterances()[index()].getAttributesByKeyPath("tsml");
    if (tsmlArray.length === 0) {
      props.setTsml(undefined);
      return;
    }
    const tsml = tsmlArray[0] as TstprjTsmlSignal;
    const isParsed = await tsml.parseTsml();
    if (isParsed) props.setTsml(tsml);
  };

  return (
    <div class={props.class}>
      <table class={css.table}>
        <thead>
          <tr>
            <th>トラック</th>
            <th>ボイス</th>
            <th>テキスト</th>
          </tr>
        </thead>
        <tbody>
          <For each={list()}>
            {(item, i) => (
              <tr
                onClick={() => updateIndex(i())}
                classList={{ [css.selected]: i() === index() }}
              >
                <td>{item.track}</td>
                <td>{item.voice}</td>
                <td>{item.text}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};

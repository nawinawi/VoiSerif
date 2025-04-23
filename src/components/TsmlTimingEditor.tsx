import { createMemo, createSignal, For } from "solid-js";
import { TstprjStringSignal, TstprjTsmlSignal } from "../feature/TstprjSignal";
import { NumberBox } from "./NumberBox";
import css from "./TsmlTimingEditor.module.scss";

type TsmlTimingEditorProps = {
  tsml: TstprjTsmlSignal;
  duration: TstprjStringSignal;
  originalDuration: TstprjStringSignal;
  start: TstprjStringSignal;
};

type Phoneme = {
  durationIdx: number;
  duration: number;
  originalDuration: number;
  phoneme: string;
  durationAttribute: TstprjStringSignal;
};

const Note = () => {
  return <div></div>;
};

export const TsmlTimingEditor = (props: TsmlTimingEditorProps) => {
  const bpmSignal = createSignal(120);
  const [bpm] = bpmSignal;
  const [numerator, setNumerator] = createSignal(4);
  const [denominator, setDenominator] = createSignal(4);

  console.log(props.duration);
  console.log(props.originalDuration);

  const phonemes = createMemo(() => {
    const od = props.originalDuration.value.split(",").map((d) => Number(d));
    const pss = props.tsml.getAttributesByKeyPath(
      "acoustic_phrase.word.phoneme"
    );
    let i = 1;
    pss.flatMap((ps) =>
      ps.value.split(/[,|]/).map(
        (p, _) =>
          ({
            durationIdx: i++,
            duration: 0,
            originalDuration: 0,
            phoneme: p,
            durationAttribute: props.duration,
          } satisfies Phoneme)
      )
    );
  });

  const numeratores = Array(16)
    .fill(0)
    .map((_, i) => i + 1);
  const denominatores = Array(4)
    .fill(0)
    .map((_, i) => 2 ** (i + 1));

  return (
    <div class={css.root}>
      <div class={css.menuRoot}>
        <div class={css.menu}>
          <div class={css.menuForm}>
            <label>BPM</label>
            <NumberBox class={css.input} min={1} max={999} signal={bpmSignal} />
          </div>
          <div class={css.menuForm}>
            <label>拍子</label>
            <div class={css.timeSignature}>
              <select
                class={css.select}
                onChange={(e) => setNumerator(Number(e.target.value))}
              >
                <For each={numeratores}>
                  {(item) => (
                    <option
                      class={css.option}
                      value={item}
                      selected={item === 4}
                    >
                      {item}
                    </option>
                  )}
                </For>
              </select>
              <span>/</span>
              <select
                class={css.select}
                onChange={(e) => setDenominator(Number(e.target.value))}
              >
                <For each={denominatores}>
                  {(item) => (
                    <option
                      class={css.option}
                      value={item}
                      selected={item === 4}
                    >
                      {item}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </div>
        </div>
        <div class={css.menu}>工事中</div>
      </div>
      <div class={css.noteRole}>工事中</div>
    </div>
  );
};

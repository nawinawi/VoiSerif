import {
  createEffect,
  createMemo,
  createSignal,
  For,
  JSXElement,
  Show,
} from "solid-js";
import { TstprjElement } from "../feature/TstprjBase";
import { TstprjStringSignal, TstprjTsmlSignal } from "../feature/TstprjSignal";
import { TsmlAccentEditor } from "./TsmlAccentEditor";
import css from "./TsmlEditor.module.scss";
import { TsmlTimingEditor } from "./TsmlTimingEditor";

type TsmlEditorProps = {
  class?: string;
  tsml: TstprjTsmlSignal;
};

export const TsmlEditor = (props: TsmlEditorProps) => {
  const [tabIdx, setTabIdx] = createSignal(0);
  const [duration, setDuration] = createSignal<TstprjStringSignal>();
  const [originalDuration, setOriginalDuration] =
    createSignal<TstprjStringSignal>();
  const [start, setStart] = createSignal<TstprjStringSignal>();

  const tabs = createMemo(
    () =>
      [
        {
          name: "タイミング",
          child: (
            <Show
              when={props.tsml && duration() && originalDuration() && start()}
            >
              <TsmlTimingEditor
                tsml={props.tsml}
                duration={duration()}
                originalDuration={originalDuration()}
                start={start()}
              />
            </Show>
          ),
        },
        {
          name: "アクセント",
          child: <TsmlAccentEditor tsml={props.tsml} />,
        },
      ] satisfies { name: string; child: JSXElement }[]
  );

  createEffect(() => {
    if (props.tsml) {
      const durations = props.tsml.parent.getAttributesByKeyPath(
        "PhonemeDuration.values"
      );
      if (durations.length > 0) {
        setDuration(durations[0] as TstprjStringSignal);
      } else {
        const duration = new TstprjElement({
          key: "PhonemeDuration",
          parent: props.tsml.parent,
          attributeLength: 1,
          childLength: 0,
        });
        const values = new TstprjStringSignal("values", "", duration);
        duration.attributes.push();
        props.tsml.parent.children.push(duration);
        setDuration(values);
      }
      const originalDurations = props.tsml.parent.getAttributesByKeyPath(
        "PhonemeOriginalDuration.values"
      );
      if (originalDurations.length > 0) {
        setOriginalDuration(originalDurations[0] as TstprjStringSignal);
      }
      const starts = props.tsml.parent.getAttributesByKeyPath("start");
      if (starts.length > 0) setStart(starts[0] as TstprjStringSignal);
    }
  });

  return (
    <div class={props.class}>
      <div class={css.tabContainer}>
        <For each={tabs()}>
          {(tab, i) => (
            <div
              onClick={() => setTabIdx(i())}
              class={css.tab}
              classList={{ [css.selected]: i() === tabIdx() }}
            >
              {tab.name}
            </div>
          )}
        </For>
      </div>
      <div class={css.editor}>
        <Show when={tabs()?.length > tabIdx()}>{tabs()[tabIdx()].child}</Show>
      </div>
    </div>
  );
};

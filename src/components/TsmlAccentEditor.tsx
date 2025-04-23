import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Signal,
} from "solid-js";
import { TsmlAttribute } from "../feature/TstprjBase";
import { TstprjTsmlSignal } from "../feature/TstprjSignal";
import css from "./TsmlAccentEditor.module.scss";

type TsmlAccentEditorProps = {
  tsml: TstprjTsmlSignal;
};

type AccentChar = {
  hlIdx: number;
  hl: Signal<"h" | "l">;
  pronunciation: string;
  hlAttribute: TsmlAttribute;
};

const Words = (props: { accentGroup: AccentChar[] }) => {
  return (
    <div class={css.words}>
      <For each={props.accentGroup}>
        {(char) => (
          <div
            class={css.charBox}
            classList={{ [css.h]: char.hl[0]() === "h" }}
            onClick={() => {
              const hl = char.hl[0]() === "h" ? "l" : "h";
              char.hlAttribute.value =
                char.hlAttribute.value.slice(0, char.hlIdx) +
                hl +
                char.hlAttribute.value.slice(char.hlIdx + 1);
            }}
          >
            {char.pronunciation}
          </div>
        )}
      </For>
    </div>
  );
};

export const TsmlAccentEditor = (props: TsmlAccentEditorProps) => {
  const chars = createMemo(() => {
    const words = props.tsml.getElementsByKeyPath("acoustic_phrase.word");
    const groups: AccentChar[][] = [];
    let current: AccentChar[];
    words.forEach((word) => {
      const chain = word.getAttributesByKeyPath("chain");
      if (!current || (chain.length > 0 && chain[0].value === "0")) {
        groups.push([]);
        current = groups.at(-1);
      }
      const hls = word.getAttributesByKeyPath("hl");
      const pronunciations = word.getAttributesByKeyPath("pronunciation");
      if (hls.length > 0 && pronunciations.length > 0) {
        const ps: string[] = [...pronunciations[0].value].filter(
          (p) => p !== "’"
        );
        [...hls[0].value].forEach((hl, i) => {
          current.push({
            hlIdx: i,
            hl: createSignal<"h" | "l">(hl === "h" ? "h" : "l"),
            pronunciation: ps[i],
            hlAttribute: hls[0],
          });
        });
      }
    });
    return groups;
  });

  let container: HTMLDivElement = null;
  const hScroll = (event: WheelEvent) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };
  onMount(() => {
    container?.addEventListener("wheel", hScroll);
  });
  onCleanup(() => {
    container?.removeEventListener("wheel", hScroll);
  });

  return (
    <div ref={container} class={css.groups}>
      <For each={chars()}>{(char) => <Words accentGroup={char} />}</For>
    </div>
  );
};

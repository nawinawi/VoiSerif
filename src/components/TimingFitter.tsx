import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import {
  getAttributesByKeyPath,
  getElementsByKeyPath,
} from "../feature/Document";
import { downloadBinaryAsFile } from "../feature/File";
import {
  Tstprj,
  TstprjElement,
  TstprjString,
  TstprjTsml,
} from "../feature/TstprjBase";
import { setPhonemeDuration } from "../feature/TstprjFunc";
import css from "./TimingFitter.module.scss";

type TimingFitterProps = {
  filename: string;
  tstprj: Tstprj;
  ccs: Document;
};

type Tempo = {
  clock: number;
  bpm: number;
};

type Note = {
  previous: Note;
  group: number;
  offset: number;
  length: number;
  lyric: string;
};

type Phoneme = {
  phoneme: string;
  durationIndex: number;
  originalDuration: number;
  fixedDuration?: number;
};

type Char = {
  previous: Char;
  next: Char;
  group: number;
  char: string;
  phonemes: Phoneme[];
  duration: TstprjString;
};

type NoteCharSet = {
  note: Note;
  char: Char;
};

export const TimingFitter = (props: TimingFitterProps) => {
  const [tsmls, setTsmls] = createSignal<TstprjTsml[]>(null);
  const [matchGroup, setMatchGroup] = createSignal(false);
  const [applied, setApplied] = createSignal(false);

  const notes = createMemo(() => {
    try {
      const units = getElementsByKeyPath(
        props.ccs,
        "Scenario.Sequence.Scene.Units.Unit"
      ).filter((unit) => {
        const c = getAttributesByKeyPath(unit, "Category");
        return c.length > 0 && c[0].value === "SingerSong";
      });
      if (units.length === 0) return [];
      const tempos = getElementsByKeyPath(units[0], "Song.Tempo.Sound")
        .map(
          (t) =>
            ({
              clock: Number(getAttributesByKeyPath(t, "Clock")[0].value),
              bpm: Number(getAttributesByKeyPath(t, "Tempo")[0].value),
            } satisfies Tempo)
        )
        .sort((a, b) => a.clock - b.clock);
      if (tempos.length === 0) return [];
      let group = -1;
      let previousNoteOff = -1;
      let previousPitch = -1;
      const ns = getElementsByKeyPath(units[0], "Song.Score.Note").map((n) => {
        const clock = Number(getAttributesByKeyPath(n, "Clock")[0].value);
        const duration = Number(getAttributesByKeyPath(n, "Duration")[0].value);
        const lyrics = getAttributesByKeyPath(n, "Lyric");
        const pitch = Number(getAttributesByKeyPath(n, "PitchStep")[0].value);
        let bpm = 120;
        let currentClock = 0;
        let currentOffset = 0;
        let length = 0;
        let rest = duration;
        let begun = false;
        for (const tempo of tempos) {
          if (tempo.clock > clock) {
            const currentLength = Math.min(clock - tempo.clock, rest);
            length += currentLength / 16 / bpm;
            rest -= currentLength;

            if (!begun) {
              currentOffset += (clock - currentClock) / 16 / bpm;
              begun = true;
            }

            if (rest <= 0) break;
          }
          currentOffset += (tempo.clock - currentClock) / 16 / bpm;
          currentClock = tempo.clock;
          bpm = tempo.bpm;
        }
        if (!begun) {
          currentOffset += (clock - currentClock) / 16 / bpm;
        }
        if (rest > 0) {
          length += rest / 16 / bpm;
        }
        if (previousNoteOff !== clock || previousPitch !== pitch) group++;
        previousNoteOff = clock + duration;
        previousPitch = pitch;
        return {
          previous: null,
          group,
          offset: currentOffset,
          length,
          lyric: lyrics.length > 0 ? lyrics[0].value : "_",
        } satisfies Note;
      });
      let g = -1;
      ns.forEach((n, i) => {
        if (n.group === g) n.previous = ns[i - 1];
        else g = n.group;
      });
      return ns as Note[];
    } catch {
      return [];
    }
  });

  const chars = createMemo(() => {
    try {
      return tsmls().flatMap((tsml, group) => {
        const words = tsml.getElementsByKeyPath("acoustic_phrase.word");
        const original = (
          tsml.parent.getAttributesByKeyPath(
            "PhonemeOriginalDuration.values"
          )[0] as TstprjString
        ).value.split(",");
        const durations = tsml.parent.getAttributesByKeyPath(
          "PhonemeDuration.values"
        );
        let duration: TstprjString;
        if (durations.length === 0) {
          const de = new TstprjElement({
            key: "PhonemeDuration",
            parent: tsml.parent,
            attributeLength: 1,
            childLength: 0,
          });
          duration = new TstprjString("values", "", de);
          de.attributes.push(duration);
          tsml.parent.children.push(de);
        } else {
          duration = durations[0] as TstprjString;
        }
        let dIdx = 0;
        const w = words.flatMap((word) => {
          const pronunciations: string[] = [];
          [...word.getAttributesByKeyPath("pronunciation")[0].value].forEach(
            (s) => {
              if (
                pronunciations.length === 0 ||
                !/^[’ァィゥェォャュョ]$/.test(s)
              )
                pronunciations.push(s);
              else pronunciations[pronunciations.length - 1] += s;
            }
          );
          const phonemes = word
            .getAttributesByKeyPath("phoneme")[0]
            .value.split("|");
          const cs = pronunciations.map((p, i) => {
            const phs = phonemes[i].split(",").map(
              (ph) =>
                ({
                  phoneme: ph,
                  durationIndex: ++dIdx,
                  originalDuration: Number(original[dIdx]),
                } satisfies Phoneme)
            );
            return {
              previous: null,
              next: null,
              group,
              char: p,
              phonemes: phs,
              duration,
            } satisfies Char;
          });
          return cs as Char[];
        });
        w.forEach((c, i) => {
          c.previous = i !== 0 ? w[i - 1] : null;
          c.next = i !== w.length - 1 ? w[i + 1] : null;
        });
        return w;
      });
    } catch {
      return [];
    }
  });

  const sets = createMemo(() => {
    let match = true;
    const ss = chars()
      .slice(0, Math.min(chars().length, notes().length))
      .map((c, i) => {
        if (c.group !== notes()[i].group) match = false;
        return {
          note: notes()[i],
          char: c,
        } satisfies NoteCharSet;
      }) as NoteCharSet[];
    setMatchGroup(match);
    return ss.reduce((accumulator: NoteCharSet[][], current) => {
      const existingGroup = accumulator.find(
        (group) =>
          group.length > 0 && group[0].note.group === current.note.group
      );
      if (existingGroup) {
        existingGroup.push(current);
      } else {
        accumulator.push([current]);
      }
      return accumulator;
    }, []);
  });

  createEffect(async () => {
    try {
      if (!tsmls()) {
        const track = props.tstprj.getElementsByKeyPath("Tracks.Track");
        if (track.length === 0) return;
        const utterances = track[0].getElementsByKeyPath("Contents.Utterance");
        if (utterances.length === 0) return;
        const ts = utterances
          .map((u) => {
            const t = u.getAttributesByKeyPath("tsml");
            return t.length > 0
              ? (u.getAttributesByKeyPath("tsml")[0] as TstprjTsml)
              : null;
          })
          .filter((t) => t != null);
        for (const t of ts) {
          if (!(await t.parseTsml())) return;
        }
        setTsmls(ts);
      }
    } catch {}
  });

  const apply = () => {
    sets()
      .flat()
      .forEach((s) => {
        const first = s.char.previous == null;
        const single = s.char.phonemes.length === 1;
        let offset = 0;
        if (single) {
          setPhonemeDuration(
            s.char.duration,
            s.char.phonemes[0].durationIndex,
            s.note.length
          );
          s.char.phonemes[0].fixedDuration = s.note.length;
        } else {
          if (first) {
            s.char.phonemes.slice(0, -1).forEach((p) => {
              p.fixedDuration = p.originalDuration;
              setPhonemeDuration(
                s.char.duration,
                p.durationIndex,
                p.fixedDuration
              );
              offset += p.fixedDuration;
            });
          } else {
            const previous = s.char.previous;
            const preDuration =
              previous.phonemes.at(-1).fixedDuration ??
              previous.phonemes.at(-1).originalDuration;
            const totalLength = s.char.phonemes
              .slice(0, -1)
              .reduce((sum, p) => sum + p.originalDuration, 0);
            const ratio = Math.min(totalLength, preDuration / 2) / totalLength;
            previous.phonemes.at(-1).fixedDuration -= Math.min(
              totalLength,
              preDuration / 2
            );
            setPhonemeDuration(
              previous.duration,
              previous.phonemes.at(-1).durationIndex,
              previous.phonemes.at(-1).fixedDuration
            );
            s.char.phonemes.slice(0, -1).forEach((p) => {
              p.fixedDuration = p.originalDuration * ratio;
              setPhonemeDuration(
                s.char.duration,
                p.durationIndex,
                p.fixedDuration
              );
              offset += p.fixedDuration;
            });
          }
          setPhonemeDuration(
            s.char.duration,
            s.char.phonemes.at(-1).durationIndex,
            s.note.length
          );
          s.char.phonemes.at(-1).fixedDuration = s.note.length;
        }
        if (first) {
          (
            s.char.duration.parent.parent.getAttributesByKeyPath(
              "start"
            )[0] as TstprjString
          ).value = (s.note.offset - offset - 0.005).toFixed(3);
        }
      });
    setApplied(true);
  };

  const save = async () => {
    if (!applied()) apply();
    downloadBinaryAsFile(await props.tstprj.serialize(), props.filename);
  };

  return (
    <div>
      <div class={css.setView}>
        <For each={sets()}>
          {(group) => (
            <div class={css.group}>
              <For each={group}>
                {(item) => (
                  <div class={css.noteCharSet}>
                    <div class={css.lyric}>{item.note.lyric}</div>
                    <div class={css.pronunciation}>{item.char.char}</div>
                    <div class={css.phoneme}>
                      {item.char.phonemes.map((p) => p.phoneme).join(",")}
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <Show when={sets().length > 0 && matchGroup()}>
        <div class={css.save} onClick={save}>
          保存
        </div>
      </Show>
    </div>
  );
};

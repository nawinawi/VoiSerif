import { TstprjString } from "./TstprjBase";

export const setPhonemeDuration = (
  phonemeDurationAttribute: TstprjString,
  index: number,
  value: number
) => {
  const durationKeyValues: { [key: number]: number } = {};
  const durations = phonemeDurationAttribute.value.split(",");
  durations.forEach((d) => {
    const keyValue = d.split(":");
    if (keyValue.length === 2) {
      durationKeyValues[Number(keyValue[0])] = Number(keyValue[1]);
    }
  });
  durationKeyValues[index] = value;
  phonemeDurationAttribute.value = Object.keys(durationKeyValues)
    .map((k) => [Number(k), durationKeyValues[Number(k)]])
    .sort((a, b) => a[0] - b[0])
    .map((kv) => `${kv[0].toFixed(3)}:${kv[1].toFixed(3)}`)
    .join(",");
};

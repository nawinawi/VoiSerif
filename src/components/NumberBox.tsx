import { createSignal, Signal } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";

type NumberBoxProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value"
> & {
  signal?: Signal<number>;
};

export const NumberBox = (props: NumberBoxProps) => {
  const [value, setValue] = createSignal(
    Number(props.signal ? props.signal[0]() : NaN)
  );

  const validate: JSX.FocusEventHandlerUnion<HTMLInputElement, FocusEvent> = (
    e
  ) => {
    const v = e.target.value
      .replaceAll(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      )
      .replaceAll(/^[－ー−ｰ]/g, "-")
      .replaceAll(/^[＋+]/g, "")
      .replaceAll(/[．。]/g, ".")
      .replaceAll(/[，、]/g, "")
      .replaceAll(/\s+/g, "");
    let n = Number(v);
    if (isNaN(n)) {
      const p = value();
      setValue(NaN);
      setValue(p);
      if (props.signal) props.signal[1](value());
      if (props.onChange) props.onChange[0](e);
      return;
    }
    console.log("valid");
    if (props.min != null) {
      n = Math.max(Number(props.min), n);
    }
    if (props.max != null) {
      n = Math.min(Number(props.max), n);
    }
    setValue(NaN);
    setValue(n);
    if (props.signal) props.signal[1](value());
    if (props.onChange) props.onChange[0](e);
  };

  const display = () => {
    return value() == null || isNaN(value()) ? "" : value();
  };

  return <input {...props} type="text" onChange={validate} value={display()} />;
};

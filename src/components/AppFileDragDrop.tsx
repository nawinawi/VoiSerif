import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import "./AppFileDragDrop.scss";

type AppFileDragDropProps = JSX.HTMLAttributes<HTMLDivElement> & {
  multiple?: boolean;
  accept?: string | RegExp;
  setFile?: (file: File | undefined) => void;
  setFiles?: (files: File[] | undefined) => void;
};

export const AppFileDragDrop = (props?: AppFileDragDropProps) => {
  let dropArea: HTMLDivElement | undefined;

  const [isDraggingOver, setIsDraggingOver] = createSignal(false);
  const abortController = new AbortController();

  const getAccepted = (list: DataTransferItemList) => {
    let files = [...list]
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile());
    if (!files || files.length === 0) return [];
    if (!props.multiple && files.length !== 1) return [];
    if (typeof props.accept === "string") {
      const cons = props.accept.split(/\s+/);
      files = files.filter((item) =>
        cons.some((con) =>
          con.includes(".")
            ? item.name.endsWith(con)
            : item.type.startsWith(con)
        )
      );
    } else if (props.accept) {
      files = files.filter((item) => (props.accept as RegExp).test(item.name));
    }
    return files;
  };

  const dragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };
  const dragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    if (event.dataTransfer) {
      const files = getAccepted(event.dataTransfer.items);
      if (files.length === 0) return;
      if (props.multiple && props.setFiles) {
        props.setFiles(files);
      } else if (!props.multiple && files.length === 1 && props.setFile) {
        props.setFile(files[0]);
      }
    }
  };

  onMount(() => {
    dropArea?.addEventListener("dragover", dragOver, {
      signal: abortController.signal,
    });
    dropArea?.addEventListener("dragleave", dragLeave, {
      signal: abortController.signal,
    });
    dropArea?.addEventListener("drop", drop, {
      signal: abortController.signal,
    });
  });
  onCleanup(() => {
    abortController.abort();
  });

  return (
    <div class="appFileDragDrop">
      <div
        ref={dropArea}
        class={`appFileDragDropArea ${props.class ?? ""}`}
        classList={{
          appFileDragDropOver: isDraggingOver(),
          ...props.classList,
        }}
      >
        {props.children ?? "ファイルをドラッグ＆ドロップ"}
      </div>
    </div>
  );
};

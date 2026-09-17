import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./RichTextEditor.jsx";

describe("RichTextEditor", () => {
  it("keeps the caret at the end while the parent stores typed content", () => {
    let value = "";
    const onChange = vi.fn(nextValue => { value = nextValue; });
    const onUploadImage = vi.fn();
    const view = render(<RichTextEditor value={value} onChange={onChange} onUploadImage={onUploadImage} />);
    const editor = view.container.querySelector("[contenteditable='true']");
    if (!(editor instanceof HTMLDivElement)) throw new Error("Rich text editor was not rendered.");

    editor.focus();
    editor.innerHTML = "L";
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    fireEvent.input(editor);
    view.rerender(<RichTextEditor value={value} onChange={onChange} onUploadImage={onUploadImage} />);

    expect(editor.innerHTML).toBe("L");
    expect(selection.anchorNode).toBe(editor);
    expect(selection.anchorOffset).toBe(1);
  });
});

import React, { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2
} from "lucide-react";
import { isSafeNewsUrl, sanitizeNewsHtml } from "../newsUtils.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function RichTextEditor({ value, onChange, onUploadImage, disabled = false }) {
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!editorRef.current || document.activeElement === editorRef.current) return;
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || "";
  }, [value]);

  function emitChange() {
    onChange(editorRef.current?.innerHTML || "");
  }

  function runCommand(command, commandValue = null) {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function insertHtml(html) {
    runCommand("insertHTML", sanitizeNewsHtml(html));
  }

  function addLink() {
    const url = window.prompt("Link URL (https://...)", "https://");
    if (!url) return;
    if (!isSafeNewsUrl(url)) {
      setUploadError("Use a valid http or https link.");
      return;
    }
    setUploadError("");
    const selection = window.getSelection()?.toString().trim();
    if (selection) runCommand("createLink", url);
    else {
      const label = window.prompt("Text for the link", url) || url;
      insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`);
    }
  }

  function addLinkCard() {
    const url = window.prompt("Link URL (https://...)", "https://");
    if (!url) return;
    if (!isSafeNewsUrl(url)) {
      setUploadError("Use a valid http or https link.");
      return;
    }
    const title = window.prompt("Title shown on the card", "View post") || "View post";
    const imageUrl = window.prompt("Optional image URL", "") || "";
    if (imageUrl && !isSafeNewsUrl(imageUrl)) {
      setUploadError("Use a valid http or https image URL.");
      return;
    }
    let hostname = url;
    try { hostname = new URL(url).hostname.replace(/^www\./, ""); } catch { /* already validated */ }
    insertHtml(
      `<a class="news-embed-card" href="${escapeHtml(url)}">` +
      (imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" />` : "") +
      `<span class="news-embed-copy"><strong class="news-embed-title">${escapeHtml(title)}</strong>` +
      `<span class="news-embed-url">${escapeHtml(hostname)}</span></span></a><p><br></p>`
    );
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadImage) return;
    setUploading(true);
    setUploadError("");
    const result = await onUploadImage(file);
    setUploading(false);
    if (!result?.success) {
      setUploadError(result?.message || "Image upload failed.");
      return;
    }
    const alt = window.prompt("Image description (for accessibility)", file.name) || file.name;
    insertHtml(
      `<figure class="news-article-image"><img src="${escapeHtml(result.imageUrl)}" alt="${escapeHtml(alt)}" />` +
      `<figcaption>${escapeHtml(alt)}</figcaption></figure><p><br></p>`
    );
  }

  const toolbarButtons = [
    ["Bold", <Bold size={17} />, () => runCommand("bold")],
    ["Italic", <Italic size={17} />, () => runCommand("italic")],
    ["Underline", <Underline size={17} />, () => runCommand("underline")],
    ["Strikethrough", <Strikethrough size={17} />, () => runCommand("strikeThrough")],
    ["Bulleted list", <List size={17} />, () => runCommand("insertUnorderedList")],
    ["Numbered list", <ListOrdered size={17} />, () => runCommand("insertOrderedList")],
    ["Quote", <Quote size={17} />, () => runCommand("formatBlock", "blockquote")],
    ["Align left", <AlignLeft size={17} />, () => runCommand("justifyLeft")],
    ["Align center", <AlignCenter size={17} />, () => runCommand("justifyCenter")],
    ["Align right", <AlignRight size={17} />, () => runCommand("justifyRight")],
    ["Add link", <Link size={17} />, addLink],
    ["Add link card", <Highlighter size={17} />, addLinkCard],
    [uploading ? "Uploading image" : "Upload image", <ImagePlus size={17} />, () => imageInputRef.current?.click()],
    ["Undo", <Undo2 size={17} />, () => runCommand("undo")],
    ["Redo", <Redo2 size={17} />, () => runCommand("redo")],
    ["Clear formatting", <RemoveFormatting size={17} />, () => runCommand("removeFormat")]
  ];

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar" aria-label="Article formatting tools">
        <select
          aria-label="Text size"
          defaultValue="p"
          disabled={disabled}
          onChange={event => runCommand("formatBlock", event.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Large heading</option>
          <option value="h3">Medium heading</option>
          <option value="h4">Small heading</option>
        </select>
        {toolbarButtons.map(([label, icon, action]) => (
          <button key={label} onMouseDown={event => event.preventDefault()} onClick={action} disabled={disabled || (label === "Uploading image")} type="button" title={label} aria-label={label}>
            {icon}
          </button>
        ))}
        <label className="rich-editor-color" title="Text color">
          <span>A</span>
          <input type="color" defaultValue="#f7f4ff" disabled={disabled} onChange={event => runCommand("foreColor", event.target.value)} />
        </label>
        <input ref={imageInputRef} className="news-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImage} />
      </div>
      <div
        ref={editorRef}
        className="rich-editor-content news-article-body"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder="Write your article here..."
        onInput={emitChange}
        dangerouslySetInnerHTML={{ __html: value || "" }}
      />
      {uploadError && <p className="news-editor-error">{uploadError}</p>}
    </div>
  );
}

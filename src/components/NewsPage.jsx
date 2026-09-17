import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, ImagePlus, Pencil, Pin, Plus, Radio, Save, Send, Trash2, X } from "lucide-react";
import { formatNewsDate, sanitizeNewsHtml } from "../newsUtils.js";
import { RichTextEditor } from "./RichTextEditor.jsx";

const EMPTY_ARTICLE = {
  id: "",
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  sourceLabel: "",
  sourceUrl: "",
  status: "draft",
  pinned: false
};

function articleDate(article) {
  return formatNewsDate(article.publishedAt || article.updatedAt || article.createdAt);
}

export function NewsPage({
  articles,
  loading,
  error,
  isAdmin,
  selectedArticleId,
  onOpenArticle,
  onBackToNews,
  onReload,
  onSave,
  onDelete,
  onUploadImage
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_ARTICLE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editorError, setEditorError] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);

  const selectedArticle = useMemo(
    () => articles.find(article => article.id === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  useEffect(() => {
    if (selectedArticleId && !loading && !selectedArticle && !error) onBackToNews?.();
  }, [selectedArticleId, selectedArticle, loading, error, onBackToNews]);

  function openNewEditor() {
    setForm({ ...EMPTY_ARTICLE });
    setMessage("");
    setEditorError("");
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEditEditor(article) {
    setForm({ ...EMPTY_ARTICLE, ...article });
    setMessage("");
    setEditorError("");
    setEditorOpen(true);
    onBackToNews?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(status) {
    setEditorError("");
    setMessage("");
    if (!form.title.trim()) {
      setEditorError("Add a title before saving.");
      return;
    }
    if (!form.content.replace(/<[^>]+>/g, "").trim() && !form.content.includes("<img")) {
      setEditorError("Write some article content before saving.");
      return;
    }
    setSaving(true);
    const result = await onSave({ ...form, content: sanitizeNewsHtml(form.content), status });
    setSaving(false);
    if (!result?.success) {
      setEditorError(result?.message || "Article could not be saved.");
      return;
    }
    setMessage(result.message || "Article saved.");
    setEditorOpen(false);
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    setEditorError("");
    const result = await onDelete(article.id);
    if (!result?.success) setEditorError(result?.message || "Article could not be deleted.");
    else {
      setMessage(result.message || "Article deleted.");
      if (selectedArticleId === article.id) onBackToNews?.();
    }
  }

  async function uploadCover(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCoverUploading(true);
    setEditorError("");
    const result = await onUploadImage(file);
    setCoverUploading(false);
    if (!result?.success) {
      setEditorError(result?.message || "Cover image upload failed.");
      return;
    }
    setForm(current => ({ ...current, coverImageUrl: result.imageUrl }));
  }

  if (selectedArticle) {
    return (
      <main className="news-page news-detail-page">
        <button className="news-back-button" onClick={onBackToNews} type="button"><ArrowLeft size={18} /> Back to news</button>
        <article className="news-detail-card">
          {selectedArticle.coverImageUrl && <img className="news-detail-cover" src={selectedArticle.coverImageUrl} alt="" />}
          <div className="news-detail-content">
            <div className="news-card-meta">
              {selectedArticle.sourceLabel && <span>{selectedArticle.sourceLabel}</span>}
              <time>{articleDate(selectedArticle)}</time>
              {selectedArticle.status === "draft" && <span className="news-draft-badge">Draft</span>}
            </div>
            <h2>{selectedArticle.title}</h2>
            {selectedArticle.excerpt && <p className="news-detail-lead">{selectedArticle.excerpt}</p>}
            <div className="news-article-body" dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(selectedArticle.content) }} />
            {selectedArticle.sourceUrl && (
              <a className="news-source-link" href={selectedArticle.sourceUrl} target="_blank" rel="noopener noreferrer">
                {selectedArticle.sourceLabel ? `View on ${selectedArticle.sourceLabel}` : "View original post"}<ExternalLink size={16} />
              </a>
            )}
            {isAdmin && (
              <div className="news-admin-actions">
                <button onClick={() => openEditEditor(selectedArticle)} type="button"><Pencil size={16} /> Edit</button>
                <button className="danger" onClick={() => deleteArticle(selectedArticle)} type="button"><Trash2 size={16} /> Delete</button>
              </div>
            )}
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="news-page">
      <section className="news-page-toolbar">
        <div>
          <span className="news-section-kicker"><Radio size={15} /> Newsroom</span>
          <h2>Latest stories</h2>
          <p>Updates, uploads and announcements from across my channels.</p>
        </div>
        <div className="news-toolbar-actions">
          {error && <button onClick={onReload} type="button">Try again</button>}
          {isAdmin && <button className="news-primary-button" onClick={openNewEditor} type="button"><Plus size={18} /> New article</button>}
        </div>
      </section>

      {editorOpen && isAdmin && (
        <section className="news-editor-panel">
          <div className="news-editor-heading">
            <div><span>News editor</span><h3>{form.id ? "Edit article" : "Create article"}</h3></div>
            <button onClick={() => setEditorOpen(false)} type="button" aria-label="Close editor"><X size={20} /></button>
          </div>
          <div className="news-editor-fields">
            <label className="news-field-wide">Title<input value={form.title} maxLength={180} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Article title" /></label>
            <label className="news-field-wide">Short introduction<textarea value={form.excerpt} maxLength={700} rows={3} onChange={event => setForm(current => ({ ...current, excerpt: event.target.value }))} placeholder="A short summary shown on the news card" /></label>
            <label>Platform or source<input value={form.sourceLabel} maxLength={80} onChange={event => setForm(current => ({ ...current, sourceLabel: event.target.value }))} placeholder="YouTube, Instagram..." /></label>
            <label>Original post URL<input type="url" value={form.sourceUrl} onChange={event => setForm(current => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://..." /></label>
            <label className="news-field-wide">Cover image URL<input type="url" value={form.coverImageUrl} onChange={event => setForm(current => ({ ...current, coverImageUrl: event.target.value }))} placeholder="https://..." /></label>
            <label className="news-cover-upload"><ImagePlus size={17} /> {coverUploading ? "Uploading..." : "Upload cover image"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={coverUploading} onChange={uploadCover} /></label>
            <label className="news-pin-toggle"><input type="checkbox" checked={form.pinned} onChange={event => setForm(current => ({ ...current, pinned: event.target.checked }))} /><Pin size={16} /> Pin this article</label>
          </div>
          {form.coverImageUrl && <img className="news-cover-preview" src={form.coverImageUrl} alt="Cover preview" />}
          <RichTextEditor value={form.content} onChange={content => setForm(current => ({ ...current, content }))} onUploadImage={onUploadImage} disabled={saving} />
          {editorError && <p className="news-editor-error">{editorError}</p>}
          <div className="news-editor-footer">
            <button onClick={() => save("draft")} disabled={saving} type="button"><Save size={17} /> Save draft</button>
            <button className="news-primary-button" onClick={() => save("published")} disabled={saving} type="button"><Send size={17} /> {saving ? "Saving..." : "Publish"}</button>
          </div>
        </section>
      )}

      {message && <div className="news-message">{message}</div>}
      {editorError && !editorOpen && <div className="news-message error">{editorError}</div>}
      {loading ? (
        <div className="news-empty-state">Loading news...</div>
      ) : error ? (
        <div className="news-empty-state"><strong>News could not be loaded.</strong><span>{error}</span></div>
      ) : articles.length === 0 ? (
        <div className="news-empty-state"><Radio size={28} /><strong>No news has been published yet.</strong>{isAdmin && <span>Create the first article with the button above.</span>}</div>
      ) : (
        <section className="news-feed">
          {articles.map((article, index) => (
            <article
              className={`news-card ${index === 0 ? "featured" : ""} ${article.status === "draft" ? "is-draft" : ""}`}
              key={article.id}
              onClick={() => onOpenArticle(article.id)}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") onOpenArticle(article.id); }}
              role="button"
              tabIndex={0}
            >
              {article.coverImageUrl ? <img src={article.coverImageUrl} alt="" loading="lazy" /> : <div className="news-card-placeholder"><Radio size={32} /></div>}
              <div className="news-card-copy">
                <div className="news-card-meta">
                  {article.pinned && <span><Pin size={12} /> Pinned</span>}
                  {article.sourceLabel && <span>{article.sourceLabel}</span>}
                  <time>{articleDate(article)}</time>
                  {article.status === "draft" && <span className="news-draft-badge">Draft</span>}
                </div>
                <h3>{article.title}</h3>
                {article.excerpt && <p>{article.excerpt}</p>}
                <span className="news-read-more">Read article <ExternalLink size={14} /></span>
              </div>
              {isAdmin && (
                <div className="news-card-admin">
                  <button onClick={event => { event.stopPropagation(); openEditEditor(article); }} type="button" aria-label={`Edit ${article.title}`}><Pencil size={16} /></button>
                  <button onClick={event => { event.stopPropagation(); deleteArticle(article); }} type="button" aria-label={`Delete ${article.title}`}><Trash2 size={16} /></button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

import React, { useEffect, useMemo } from "react";
import { ArrowLeft, ExternalLink, Pin, Radio } from "lucide-react";
import { formatNewsDate, sanitizeNewsHtml } from "../newsUtils.js";

function articleDate(article) {
  return formatNewsDate(article.publishedAt || article.updatedAt || article.createdAt);
}

export function NewsPage({
  articles,
  loading,
  error,
  selectedArticleId,
  onOpenArticle,
  onBackToNews,
  onReload
}) {
  const selectedArticle = useMemo(
    () => articles.find(article => article.id === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  useEffect(() => {
    if (selectedArticleId && !loading && !selectedArticle && !error) onBackToNews?.();
  }, [selectedArticleId, selectedArticle, loading, error, onBackToNews]);

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
          <h2>Latest News</h2>
          <p>Demon List updates, YouTube uploads and in-game announcements get posted on this page. Posts regarding GD and Moik&apos;s Demon List get posted in English and posts regarding my main channel get posted in Dutch.</p>
        </div>
        <div className="news-toolbar-actions">
          {error && <button onClick={onReload} type="button">Try again</button>}
        </div>
      </section>
      {loading ? (
        <div className="news-empty-state">Loading news...</div>
      ) : error ? (
        <div className="news-empty-state"><strong>News could not be loaded.</strong><span>{error}</span></div>
      ) : articles.length === 0 ? (
        <div className="news-empty-state"><Radio size={28} /><strong>No news has been published yet.</strong></div>
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
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

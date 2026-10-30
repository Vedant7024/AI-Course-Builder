import "./VideoList.css";

export default function VideoList({ videos, activeId, onSelect }) {
  // null/undefined aaye to bhi crash na ho
  const list = Array.isArray(videos) ? videos : [];

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="video-grid">
      {list.map((v) => {
        const thumb =
          v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

        return (
          <div key={v.videoId} className="video-card">
            <div className="video-frame">
              {activeId === v.videoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0`}
                  title={v.title || "YouTube video"}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="video-thumb"
                  onClick={() => onSelect(v.videoId)}
                  aria-label={`Play ${v.title || "video"}`}
                >
                  <img src={thumb} alt={v.title || "Video thumbnail"} />
                  <span className="play-icon">▶</span>
                </button>
              )}
            </div>

            <h3 className="video-title">{v.title}</h3>

            {v.description && (
              <p className="video-description">{v.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
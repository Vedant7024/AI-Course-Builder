
import "./VideoList.css";

export default function VideoList({
  videos,
  activeId,
  onSelect,
}) {
  const list = Array.isArray(videos) ? videos : [];

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="video-grid">
      {list.map((video) => {
        const videoId = video.videoId;

        if (!videoId) {
          return null;
        }

        const thumbnail =
          video.thumbnail ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        const isActive = activeId === videoId;

        return (
          <article key={videoId} className="video-card">
            <div className="video-frame">
              {isActive ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
                  title={video.title || "YouTube video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <button
                  type="button"
                  className="video-thumb"
                  onClick={() => onSelect(videoId)}
                  aria-label={`Play ${video.title || "video"}`}
                >
                  <img
                    src={thumbnail}
                    alt={video.title || "Video thumbnail"}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src =
                        `https://img.youtube.com/vi/${videoId}/default.jpg`;
                    }}
                  />

                  <span className="play-icon" aria-hidden="true">
                    ▶
                  </span>
                </button>
              )}
            </div>

            <div className="video-card-content">
              <span className="video-card-label">
                <span className="video-label-dot" />
                VIDEO LESSON
              </span>

              <h3 className="video-title">
                {video.title || "YouTube video"}
              </h3>

              {video.description && (
                <p className="video-description">
                  {video.description}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

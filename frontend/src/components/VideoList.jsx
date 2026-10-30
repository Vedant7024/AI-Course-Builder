import { useEffect, useState } from "react";
import "./VideoList.css";

export default function VideoList({ videos = [], lessonId }) {
  // Abhi kaunsa video chal raha hai (null = koi nahi)
  const [activeId, setActiveId] = useState(null);

  // Lesson badalne par chalta hua video band ho jaye
  useEffect(() => {
    setActiveId(null);
  }, [lessonId]);

  if (!videos.length) {
    return <p className="video-empty">No videos found for this lesson.</p>;
  }

  return (
    <div className="video-grid">
      {videos.map((v) => {
        const thumb =
          v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

        return (
          <div key={v.videoId} className="video-card">
            <div className="video-frame">
              {activeId === v.videoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0`}
                  title={v.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="video-thumb"
                  onClick={() => setActiveId(v.videoId)}
                  aria-label={`Play ${v.title}`}
                >
                  <img src={thumb} alt={v.title} />
                  <span className="play-icon">▶</span>
                </button>
              )}
            </div>
            <p className="video-title">{v.title}</p>
          </div>
        );
      })}
    </div>
  );
}
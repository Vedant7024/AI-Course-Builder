
import React from "react";
import "./VideoList.css";

export default function VideoList({ videos = [] }) {
  const getVideoId = (video) => {
    if (video.videoId) return video.videoId;

    const url = video.url || "";

    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&?/]+)/
    );

    return match ? match[1] : null;
  };

  const validVideos = videos
    .map((video) => ({
      ...video,
      videoId: getVideoId(video),
    }))
    .filter((video) => video.videoId);

  if (!validVideos.length) {
    return (
      <div className="video-empty">
        <h3>No videos found</h3>
        <p>Try searching for this lesson again.</p>
      </div>
    );
  }

  return (
    <section className="video-list">
      {validVideos.map((video, index) => (
        <article className="video-card" key={video.videoId}>
          <div className="video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.videoId}`}
              title={video.title || `Lesson video ${index + 1}`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <div className="video-content">
            <h3>
              {video.title || `Lesson Video ${index + 1}`}
            </h3>

            {video.description && (
              <p>{video.description}</p>
            )}

            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on YouTube ↗
            </a>
          </div>
        </article>
      ))}
    </section>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./gallery.module.css";

const galleryImages = [
  {
    src: "/features/gubify-convert-message.png",
    width: 1122,
    height: 1402,
    title: "Turn messages into actions",
    description: "Convert a chat message into a task, event, shared budget or group goal.",
    alt: "Gubify screen showing a message being converted into an action.",
  },
  {
    src: "/features/gubify-communities.png",
    width: 1122,
    height: 1402,
    title: "Join communities you love",
    description: "Discover communities around shared interests and meet people who care about the same things.",
    alt: "Gubify communities screen with interest categories and community cards.",
  },
  {
    src: "/features/gubify-level-up.png",
    width: 1122,
    height: 1402,
    title: "Level up by helping others",
    description: "Earn progress when your answers help the community and are marked as the best.",
    alt: "Gubify requests and level screen showing experience progress and recent requests.",
  },
  {
    src: "/gallery/gub-home.webp",
    width: 860,
    height: 1829,
    title: "Your Gub at a glance",
    description: "Tasks, calendar, proposals, shared budget and group goals stay together in one place.",
    alt: "Gubify Gub home screen showing tasks, calendar, proposals, shared budget and group goal cards.",
  },
  {
    src: "/gallery/gubify-startup.webp",
    width: 852,
    height: 1846,
    title: "Organize life together",
    description: "The Gubify experience is built around people, shared plans and everything that keeps a group connected.",
    alt: "Gubify branded artwork with the Gubify logo and a group of friends.",
  },
] as const;

const galleryVideos = [
  {
    src: "/gallery/videos/shared-budget.mp4",
    poster: "/gallery/posters/shared-budget.webp",
    title: "Shared Budget",
    description: "See how a group can keep a shared goal and contributions visible in one place.",
  },
  {
    src: "/gallery/videos/turn-messages-into-actions.mp4",
    poster: "/gallery/posters/turn-messages-into-actions.webp",
    title: "Turn messages into actions",
    description: "A conversation can become something the group can actually organise and complete.",
  },
  {
    src: "/gallery/videos/message-to-action.mp4",
    poster: "/gallery/posters/message-to-action.webp",
    title: "From a Gub to real action",
    description: "Create your Gub, chat naturally and turn the important parts of the conversation into action.",
  },
] as const;

export default function GalleryContent() {
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeLightbox = useCallback(() => {
    const previousIndex = activeImage;
    setActiveImage(null);
    if (previousIndex !== null) {
      window.requestAnimationFrame(() => openerRefs.current[previousIndex]?.focus());
    }
  }, [activeImage]);

  const showImage = useCallback((index: number) => {
    const nextIndex = (index + galleryImages.length) % galleryImages.length;
    setActiveImage(nextIndex);
  }, []);

  useEffect(() => {
    if (activeImage === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showImage(activeImage - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showImage(activeImage + 1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage, closeLightbox, showImage]);

  return (
    <>
      <section className={`${styles.section} ${styles.videoSection}`} aria-labelledby="gallery-videos-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>Videos</span>
            <h2 id="gallery-videos-title">Watch Gubify work</h2>
          </div>
          <p>Short demos, hosted directly by Gubify.</p>
        </div>

        <div className={styles.videoGrid}>
          {galleryVideos.map((video) => (
            <article className={styles.videoCard} key={video.src}>
              <div className={styles.videoShell}>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={video.poster}
                  aria-label={video.title}
                >
                  <source src={video.src} type="video/mp4" />
                  Your browser does not support the video element.
                </video>
              </div>
              <div className={styles.cardCopy}>
                <h3>{video.title}</h3>
                <p>{video.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="gallery-images-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>Screens & artwork</span>
            <h2 id="gallery-images-title">Explore the app</h2>
          </div>
          <p>Open any image to see it in full size.</p>
        </div>

        <div className={styles.imageGrid}>
          {galleryImages.map((item, index) => (
            <article className={styles.imageCard} key={item.src}>
              <button
                className={styles.imageButton}
                type="button"
                onClick={() => setActiveImage(index)}
                ref={(node) => { openerRefs.current[index] = node; }}
                aria-label={`Open image: ${item.title}`}
              >
                <span className={styles.imageFrame}>
                  <Image
                    src={item.src}
                    width={item.width}
                    height={item.height}
                    alt={item.alt}
                    sizes="(max-width: 720px) 92vw, (max-width: 1100px) 46vw, 31vw"
                    unoptimized
                  />
                </span>
                <span className={styles.expandBadge} aria-hidden="true">↗</span>
              </button>
              <div className={styles.cardCopy}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeImage !== null && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${activeImage + 1} of ${galleryImages.length}: ${galleryImages[activeImage].title}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLightbox();
          }}
        >
          <div className={styles.lightboxToolbar}>
            <span>{activeImage + 1} / {galleryImages.length}</span>
            <button ref={closeButtonRef} type="button" onClick={closeLightbox}>
              Close <span aria-hidden="true">×</span>
            </button>
          </div>

          <button
            className={`${styles.lightboxArrow} ${styles.previous}`}
            type="button"
            onClick={() => showImage(activeImage - 1)}
            aria-label="Previous image"
          >
            ←
          </button>

          <figure className={styles.lightboxFigure}>
            <Image
              src={galleryImages[activeImage].src}
              width={galleryImages[activeImage].width}
              height={galleryImages[activeImage].height}
              alt={galleryImages[activeImage].alt}
              sizes="96vw"
              unoptimized
              priority
            />
            <figcaption>{galleryImages[activeImage].title}</figcaption>
          </figure>

          <button
            className={`${styles.lightboxArrow} ${styles.next}`}
            type="button"
            onClick={() => showImage(activeImage + 1)}
            aria-label="Next image"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}

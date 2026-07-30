"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const features = [
  {
    src: "/features/gubify-convert-message.png",
    alt: "Gubify feature showing how a chat message can be converted into a task, event, shared budget or group goal.",
    label: "Turn messages into actions",
  },
  {
    src: "/features/gubify-communities.png",
    alt: "Gubify feature showing communities based on interests such as travel, sports, food, music, gaming and technology.",
    label: "Join communities you love",
  },
  {
    src: "/features/gubify-level-up.png",
    alt: "Gubify feature showing the request and level system where users earn experience when their answer is selected as the best.",
    label: "Level up by helping others",
  },
] as const;

export default function FeatureGallery() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const showSlide = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const nextIndex = Math.max(0, Math.min(features.length - 1, index));
    setActiveIndex(nextIndex);
    const track = trackRef.current;
    if (track) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: track.clientWidth * nextIndex,
        behavior: reducedMotion ? "auto" : behavior,
      });
    }
  }, []);

  const closeGallery = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  const openGallery = () => {
    setIsOpen(true);
    setActiveIndex(0);
    window.requestAnimationFrame(() => {
      showSlide(0, "auto");
      dialogRef.current
        ?.querySelector<HTMLButtonElement>(".feature-gallery-close")
        ?.focus();
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGallery();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(activeIndex - 1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(activeIndex + 1);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, closeGallery, isOpen, showSlide]);

  const handleTrackScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.max(0, Math.min(features.length - 1, nextIndex)));
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab" && event.target === event.currentTarget) {
      event.preventDefault();
      event.currentTarget
        .querySelector<HTMLButtonElement>(".feature-gallery-close")
        ?.focus();
    }
  };

  return (
    <>
      <button
        className="feature-gallery-opener"
        type="button"
        onClick={openGallery}
        ref={openerRef}
        aria-haspopup="dialog"
      >
        <Image
          src="/gubify-feature-showcase.png"
          width="1536"
          height="1024"
          alt="Gubify app screens showing a message converted into an action, interest-based communities, and levels earned by helping others"
          priority
          unoptimized
        />
        <span className="feature-gallery-open-label">
          <span aria-hidden="true">⛶</span>
          View features
        </span>
      </button>
      <p className="feature-gallery-hint">
        <span className="feature-gallery-hint-desktop">Click to explore each feature in full screen.</span>
        <span className="feature-gallery-hint-mobile">Tap to explore each feature.</span>
      </p>

      <div
        className="feature-gallery-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Gubify feature gallery"
        hidden={!isOpen}
        ref={dialogRef}
        onKeyDown={handleDialogKeyDown}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeGallery();
        }}
      >
        <div className="feature-gallery-toolbar">
          <span aria-live="polite">{activeIndex + 1} / {features.length}</span>
          <button
            className="feature-gallery-close"
            type="button"
            onClick={closeGallery}
            aria-label="Close feature gallery"
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="feature-gallery-stage">
          <button
            className="feature-gallery-arrow feature-gallery-previous"
            type="button"
            onClick={() => showSlide(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Previous feature"
          >
            <span aria-hidden="true">←</span>
          </button>

          <div
            className="feature-gallery-track"
            ref={trackRef}
            onScroll={handleTrackScroll}
          >
            {features.map((feature, index) => (
              <figure
                className="feature-gallery-slide"
                key={feature.src}
                aria-label={`${index + 1} of ${features.length}: ${feature.label}`}
              >
                <Image
                  src={feature.src}
                  width="1122"
                  height="1402"
                  alt={feature.alt}
                  loading="lazy"
                  unoptimized
                />
              </figure>
            ))}
          </div>

          <button
            className="feature-gallery-arrow feature-gallery-next"
            type="button"
            onClick={() => showSlide(activeIndex + 1)}
            disabled={activeIndex === features.length - 1}
            aria-label="Next feature"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <nav className="feature-gallery-dots" aria-label="Choose a feature">
          {features.map((feature, index) => (
            <button
              type="button"
              key={feature.src}
              className={index === activeIndex ? "active" : ""}
              onClick={() => showSlide(index)}
              aria-label={`Show feature ${index + 1}: ${feature.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </nav>
      </div>
    </>
  );
}

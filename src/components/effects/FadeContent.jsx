import React, { useEffect, useRef, useState } from "react";

export function FadeContent({ children, className = "", delay = 0, as: Tag = "div" }) {
  const elementRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.08, rootMargin: "60px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={elementRef}
      className={`fade-content ${visible ? "is-visible" : ""} ${className}`.trim()}
      style={{ "--fade-delay": `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

import React from "react";

const BLUR_LAYERS = [2, 4, 7, 11, 17, 25];

export function GradualBlur() {
  return (
    <>
      <div className="gradual-blur gradual-blur-top" aria-hidden="true">
        {BLUR_LAYERS.map((blur, index) => (
          <span key={blur} style={{ "--blur": `${blur}px`, "--blur-index": index }} />
        ))}
      </div>
      <div className="gradual-blur gradual-blur-bottom" aria-hidden="true">
        {BLUR_LAYERS.map((blur, index) => (
          <span key={blur} style={{ "--blur": `${blur}px`, "--blur-index": index }} />
        ))}
      </div>
    </>
  );
}

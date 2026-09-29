import { useState } from "react";

export const CG_PORTRAIT_MEDIA = "(max-width: 900px) and (orientation: portrait)";

/** Native picture selection is resolved before paint; no resize-effect source swap. */
export default function CgArtwork({ src, srcMobile, className, onError }: {
  src: string;
  srcMobile?: string;
  className?: string;
  onError?: () => void;
}) {
  const [failedPortrait, setFailedPortrait] = useState<string>();
  const portrait = srcMobile && failedPortrait !== srcMobile ? srcMobile : undefined;
  return (
    <picture className="cg-artwork">
      {portrait && <source media={CG_PORTRAIT_MEDIA} srcSet={portrait} />}
      <img src={src} alt="剧情插图" className={className} onError={() => {
        if (portrait && window.matchMedia(CG_PORTRAIT_MEDIA).matches) {
          setFailedPortrait(portrait);
        } else onError?.();
      }} />
    </picture>
  );
}

"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { productImageSources, retryProductImageUrl } from "@/lib/product-image-loading";

type Props = Omit<ImageProps, "src" | "onError"> & {
  src: string | null;
  alternatives?: string[];
  fallbackClassName?: string;
};

/** Each source gets one fresh request; only then try another real product image. */
function ImageRequest({ src, alt, alternatives, fallbackClassName = "product-image-placeholder", ...props }: Props) {
  const sources = productImageSources(src, alternatives);
  const [request, setRequest] = useState({ index: 0, retried: false });
  const source = sources[request.index];
  if (!source) return <span className={fallbackClassName} aria-hidden="true" />;
  return <Image {...props} alt={alt} src={request.retried ? retryProductImageUrl(source) : source}
    onError={() => setRequest((current) => current.retried
      ? { index: current.index + 1, retried: false }
      : { ...current, retried: true })} />;
}

export function StorefrontProductImage(props: Props) {
  // Changing a variant/gallery selection starts a new request, never a stale failed state.
  return <ImageRequest key={props.src ?? ""} {...props} />;
}

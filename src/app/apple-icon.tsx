import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The same geometry as src/app/icon.svg, without the rounded corners —
// iOS applies its own mask to home-screen icons.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" fill="#c6f432"/><path d="M20 8.5V29.8C20 35 22.6 37.6 26.6 37.6C28.8 37.6 30.3 36.6 31.6 34.9L38.5 25.6" stroke="#0d1117" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 16.5H28" stroke="#0d1117" stroke-width="6.2" stroke-linecap="round"/></svg>`;

/** The home-screen icon, rendered from the brand mark. */
export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
      width={180}
      height={180}
      alt=""
    />,
    size
  );
}

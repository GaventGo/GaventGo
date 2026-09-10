declare module "jsqr" {
  interface QRCodePoint {
    x: number;
    y: number;
  }

  interface QRCodeLocation {
    topLeftCorner: QRCodePoint;
    topRightCorner: QRCodePoint;
    bottomLeftCorner: QRCodePoint;
    bottomRightCorner: QRCodePoint;
  }

  interface QRCode {
    data: string;
    location: QRCodeLocation;
  }

  interface Options {
    inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QRCode | null;
}

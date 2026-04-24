// Crop client-side: gera múltiplos formatos a partir de UMA imagem.
// Economia: 1 geração com Nano Banana → 3 formatos (Reels/Stories 9:16,
// Feed 1:1, Landscape 16:9). Zero crédito extra.

export type SocialFormat = {
  key: "reels" | "feed" | "story" | "landscape";
  label: string;
  width: number;
  height: number;
};

export const SOCIAL_FORMATS: SocialFormat[] = [
  { key: "reels", label: "Reels / TikTok (9:16)", width: 1080, height: 1920 },
  { key: "feed", label: "Feed Instagram (1:1)", width: 1080, height: 1080 },
  { key: "story", label: "Stories (9:16)", width: 1080, height: 1920 },
  { key: "landscape", label: "Facebook Landscape (16:9)", width: 1280, height: 720 },
];

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

export async function fileToOptimizedDataUrl(
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
    mimeType?: string;
  },
): Promise<string> {
  const maxDimension = options?.maxDimension ?? 1536;
  const quality = options?.quality ?? 0.86;
  const mimeType = options?.mimeType ?? "image/jpeg";
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL(mimeType, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Recorta a imagem para o formato alvo preservando o centro (cover). */
export async function cropToFormat(
  src: string,
  fmt: SocialFormat,
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = fmt.width;
  canvas.height = fmt.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  const targetRatio = fmt.width / fmt.height;
  const srcRatio = img.width / img.height;

  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (srcRatio > targetRatio) {
    // Source mais larga → corta laterais
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    // Source mais alta → corta topo/rodapé
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, fmt.width, fmt.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function cropToAllFormats(
  src: string,
): Promise<Record<SocialFormat["key"], string>> {
  const entries = await Promise.all(
    SOCIAL_FORMATS.map(async (f) => [f.key, await cropToFormat(src, f)] as const),
  );
  return Object.fromEntries(entries) as Record<SocialFormat["key"], string>;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

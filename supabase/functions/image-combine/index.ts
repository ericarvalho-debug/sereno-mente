// Edge function: image-combine
// Combina 2 imagens usando APENAS Hugging Face Inference API (tier gratuito).
// 0 créditos do Lovable AI.
//
// Estratégia:
//  1) BLIP (Salesforce/blip-image-captioning-large) descreve a imagem 2 (referência).
//  2) SDXL Refiner (img2img) usa a imagem 1 como base + prompt enriquecido
//     com a descrição da imagem 2 + a instrução do usuário.
//
// Limitações honestas:
//  - SDXL Refiner é img2img de UMA imagem só. A "fusão" da segunda imagem
//    acontece via descrição textual (não é pixel-a-pixel como Nano Banana).
//  - Pode haver cold start (~30s) e rate limits do HF.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HF_REFINER = "stabilityai/stable-diffusion-xl-refiner-1.0";
const HF_CAPTION = "Salesforce/blip-image-captioning-large";

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function bytesToDataUrl(bytes: Uint8Array, mime = "image/png"): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

async function captionImage(
  imageDataUrl: string,
  hfToken: string,
): Promise<string> {
  const bytes = dataUrlToBytes(imageDataUrl);
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_CAPTION}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/octet-stream",
        Accept: "application/json",
      },
      body: bytes,
    },
  );
  if (!res.ok) {
    const t = await res.text();
    console.error("BLIP caption error", res.status, t.slice(0, 200));
    return ""; // fallback silencioso — segue sem descrição
  }
  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) {
    return String(data[0].generated_text);
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_KEY");
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: "HUGGINGFACE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { baseImage, referenceImage, prompt, strength } = await req.json();

    if (!baseImage || typeof baseImage !== "string") {
      return new Response(
        JSON.stringify({ error: "baseImage é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!referenceImage || typeof referenceImage !== "string") {
      return new Response(
        JSON.stringify({ error: "referenceImage é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Descreve a imagem de referência
    const refCaption = await captionImage(referenceImage, HF_TOKEN);

    // 2) Monta prompt enriquecido
    const enriched = refCaption
      ? `${prompt}. Apply this style/elements from reference: ${refCaption}.`
      : prompt;

    // 3) img2img com SDXL Refiner usando a imagem base
    const baseBytes = dataUrlToBytes(baseImage);
    const baseB64 = btoa(String.fromCharCode(...baseBytes));

    const body = {
      inputs: enriched,
      parameters: {
        image: baseB64,
        strength: typeof strength === "number" ? strength : 0.55,
        guidance_scale: 7.5,
        num_inference_steps: 30,
      },
      options: { wait_for_model: true },
    };

    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${HF_REFINER}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify(body),
      },
    );

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      console.error("HF refiner error", hfRes.status, errText.slice(0, 300));
      let msg = `Hugging Face: ${hfRes.status}`;
      if (hfRes.status === 401) msg = "Token Hugging Face inválido.";
      else if (hfRes.status === 429) msg = "Rate limit do HF atingido. Aguarde alguns segundos.";
      else if (hfRes.status === 503) msg = "Modelo carregando no HF (cold start). Tente novamente em ~30s.";
      return new Response(
        JSON.stringify({ error: msg, detail: errText.slice(0, 300) }),
        { status: hfRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ct = hfRes.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) {
      const txt = await hfRes.text();
      console.error("HF non-image response:", txt.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "HF retornou resposta inesperada", detail: txt.slice(0, 300) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = new Uint8Array(await hfRes.arrayBuffer());
    const dataUrl = bytesToDataUrl(buf, ct);

    return new Response(
      JSON.stringify({ imageUrl: dataUrl, captionUsed: refCaption }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("image-combine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

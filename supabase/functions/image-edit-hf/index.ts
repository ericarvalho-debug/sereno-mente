// Edge function: image-edit-hf
// img2img usando Hugging Face Inference API (tier gratuito).
// Modelo: stabilityai/stable-diffusion-xl-refiner-1.0 (img2img nativo).
// NÃO consome créditos do Lovable AI — usa o token gratuito do usuário.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HF_MODEL = "stabilityai/stable-diffusion-xl-refiner-1.0";
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToDataUrl(bytes: Uint8Array, mime = "image/png"): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
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

    const { imageDataUrl, prompt, negativePrompt, strength } = await req.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageDataUrl é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inputBytes = dataUrlToBytes(imageDataUrl);
    const inputBase64 = btoa(String.fromCharCode(...inputBytes));

    const body = {
      inputs: prompt,
      parameters: {
        image: inputBase64,
        negative_prompt: negativePrompt || undefined,
        strength: typeof strength === "number" ? strength : 0.6,
        guidance_scale: 7.5,
        num_inference_steps: 30,
      },
      options: { wait_for_model: true },
    };

    const hfRes = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify(body),
    });

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      console.error("HF error", hfRes.status, errText);
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
      JSON.stringify({ imageUrl: dataUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("image-edit-hf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

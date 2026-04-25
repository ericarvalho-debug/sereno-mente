// Edge function: image-edit
// Usa a Google Gemini API NATIVA (chave grátis do usuário) quando GOOGLE_GEMINI_API_KEY
// estiver configurada. Caso contrário, faz fallback para Lovable AI Gateway (consome créditos).
// Modelo: gemini-2.5-flash-image (Nano Banana) — suporta edição de imagem.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { mimeType: "image/png", base64: dataUrl.replace(/^data:[^,]+,/, "") };
  return { mimeType: m[1], base64: m[2] };
}

async function callGoogleGeminiEdit(
  apiKey: string,
  prompt: string,
  images: string[],
): Promise<string> {
  const parts: any[] = [{ text: prompt }];
  for (const img of images) {
    const { mimeType, base64 } = parseDataUrl(img);
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const candParts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of candParts) {
    const inline = p.inline_data ?? p.inlineData;
    if (inline?.data) {
      const mt = inline.mime_type ?? inline.mimeType ?? "image/png";
      return `data:${mt};base64,${inline.data}`;
    }
  }
  throw new Error("Google Gemini não retornou imagem");
}

async function callLovableAIEdit(
  apiKey: string,
  prompt: string,
  images: string[],
): Promise<string> {
  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) content.push({ type: "image_url", image_url: { url: img } });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    const err: any = new Error(`Lovable AI ${res.status}: ${t.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("Lovable AI não retornou imagem");
  return url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl, prompt, negativePrompt } = await req.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageDataUrl é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt = negativePrompt && negativePrompt.trim()
      ? `${prompt}\n\nAvoid: ${negativePrompt}`
      : prompt;

    const GOOGLE_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

    let imageUrl: string;
    let provider: "google" | "lovable" = "lovable";

    if (GOOGLE_KEY) {
      try {
        imageUrl = await callGoogleGeminiEdit(GOOGLE_KEY, fullPrompt, [imageDataUrl]);
        provider = "google";
      } catch (e) {
        console.error("Google Gemini falhou, tentando Lovable AI:", e);
        if (!LOVABLE_KEY) {
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Falha Google" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        imageUrl = await callLovableAIEdit(LOVABLE_KEY, fullPrompt, [imageDataUrl]);
      }
    } else if (LOVABLE_KEY) {
      try {
        imageUrl = await callLovableAIEdit(LOVABLE_KEY, fullPrompt, [imageDataUrl]);
      } catch (e: any) {
        const status = e?.status === 429 || e?.status === 402 ? e.status : 500;
        const msg = status === 429 ? "Limite de requisições atingido." :
                    status === 402 ? "Créditos insuficientes. Configure GOOGLE_GEMINI_API_KEY para uso grátis." :
                    (e?.message ?? "Erro no gateway");
        return new Response(JSON.stringify({ error: msg }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Nenhuma chave configurada (GOOGLE_GEMINI_API_KEY ou LOVABLE_API_KEY)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-edit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

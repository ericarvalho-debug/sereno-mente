import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Download,
  Sparkles,
  ImageIcon,
  Upload,
  Wand2,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  SOCIAL_FORMATS,
  cropToAllFormats,
  downloadDataUrl,
  type SocialFormat,
} from "@/lib/imageCrop";

const MODELS = ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"];
const SIZES = [
  { label: "Quadrado (1024×1024)", w: 1024, h: 1024 },
  { label: "Paisagem (1280×720)", w: 1280, h: 720 },
  { label: "Retrato (720×1280)", w: 720, h: 1280 },
  { label: "Wide (1536×640)", w: 1536, h: 640 },
];

const EXAMPLE_PROMPT = `Professional portrait of a confident middle-aged woman, wearing elegant black clothing and glasses, smiling, arms crossed, centered composition, sharp focus, studio lighting, warm tones. Background: modern office environment, softly blurred bokeh, neutral colors (beige, brown, soft light), clean and professional atmosphere. Style: advertising creative, social media marketing post, high contrast, cinematic lighting, depth of field, ultra realistic, 4k. Mood: trustworthy, professional, authoritative, legal/financial advisory theme. No distortions, no extra limbs, no blur on face.`;

const EXAMPLE_EDIT_PROMPT = `Keep the person exactly the same, preserve face, identity and pose. Replace only the background with a modern office, soft blur, warm tones, professional lighting, depth of field.`;
const EXAMPLE_NEGATIVE = `deformed face, different person, blurry face, distorted body`;

function downloadAsJpg(srcUrl: string) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const res = await fetch(srcUrl);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não suportado");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      canvas.toBlob(
        (jpgBlob) => {
          if (!jpgBlob) return reject(new Error("Falha ao converter"));
          const link = document.createElement("a");
          const objectUrl = URL.createObjectURL(jpgBlob);
          link.href = objectUrl;
          link.download = `imagem-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
          resolve();
        },
        "image/jpeg",
        0.95,
      );
    } catch (e) {
      reject(e);
    }
  });
}

export default function ImageGen() {
  // -------- Modo "Gerar" (text-to-image, grátis via Pollinations) --------
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("flux");
  const [sizeIdx, setSizeIdx] = useState(0);
  const [seed, setSeed] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva a imagem que deseja gerar");
      return;
    }
    setLoading(true);
    setImageUrl(null);
    try {
      const size = SIZES[sizeIdx];
      const usedSeed =
        seed.trim() || Math.floor(Math.random() * 1_000_000).toString();
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt,
      )}?width=${size.w}&height=${size.h}&model=${model}&seed=${usedSeed}&nologo=true`;

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar"));
        img.src = url;
      });
      setImageUrl(url);
      toast.success("Imagem gerada!");
    } catch {
      toast.error("Não foi possível gerar a imagem.");
    } finally {
      setLoading(false);
    }
  };

  // -------- Modo "Editar" (img2img / Stable Diffusion XL via Hugging Face — grátis) --------
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [editedUrl, setEditedUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSourceDataUrl(reader.result as string);
    reader.onerror = () => toast.error("Falha ao ler a imagem");
    reader.readAsDataURL(file);
  };

  const handleEdit = async () => {
    if (!sourceDataUrl) {
      toast.error("Envie uma imagem de referência");
      return;
    }
    if (!editPrompt.trim()) {
      toast.error("Descreva a edição desejada");
      return;
    }
    setEditing(true);
    setEditedUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("image-edit-hf", {
        body: {
          imageDataUrl: sourceDataUrl,
          prompt: editPrompt,
          negativePrompt,
          strength: 0.6,
        },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error(data?.error || "Sem imagem na resposta");
      setEditedUrl(data.imageUrl);
      toast.success("Imagem editada!");
    } catch (e: any) {
      const msg = e?.message || "Falha na edição";
      toast.error(msg);
    } finally {
      setEditing(false);
    }
  };

  // -------- Modo "Combinar 2 imagens" (Nano Banana via Lovable AI — pago) --------
  const baseFileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);
  const [baseImg, setBaseImg] = useState<string | null>(null);
  const [refImg, setRefImg] = useState<string | null>(null);
  const [combinePrompt, setCombinePrompt] = useState("");
  const [combinedUrl, setCombinedUrl] = useState<string | null>(null);
  const [combining, setCombining] = useState(false);
  const [variants, setVariants] = useState<Record<SocialFormat["key"], string> | null>(null);
  const [activeVariant, setActiveVariant] = useState<SocialFormat["key"]>("reels");

  const readFileToDataUrl = (file: File, set: (s: string) => void) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set(reader.result as string);
    reader.onerror = () => toast.error("Falha ao ler a imagem");
    reader.readAsDataURL(file);
  };

  const handleCombine = async () => {
    if (!baseImg) return toast.error("Envie a foto base (do criativo)");
    if (!refImg) return toast.error("Envie a foto de referência");
    if (!combinePrompt.trim()) return toast.error("Descreva como combinar");
    setCombining(true);
    setCombinedUrl(null);
    setVariants(null);
    try {
      const { data, error } = await supabase.functions.invoke("image-combine", {
        body: { baseImage: baseImg, referenceImage: refImg, prompt: combinePrompt },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error(data?.error || "Sem imagem na resposta");
      setCombinedUrl(data.imageUrl);
      // Gera os 4 formatos a partir da MESMA imagem (sem créditos extras)
      const v = await cropToAllFormats(data.imageUrl);
      setVariants(v);
      toast.success("Imagem gerada nos 4 formatos!");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao combinar");
    } finally {
      setCombining(false);
    }
  };

  const scheduleVariant = async (formatKey: SocialFormat["key"]) => {
    if (!variants) return;
    const dataUrl = variants[formatKey];
    // Stash no sessionStorage para a página de agendamento consumir
    sessionStorage.setItem("pending_post_image", dataUrl);
    sessionStorage.setItem("pending_post_caption", combinePrompt);
    window.location.href = "/schedule";
  };

  return (
    <Layout>
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/40 px-4 py-1.5 text-sm text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              Geração grátis (Pollinations) + Edição img2img grátis (Stable Diffusion XL)
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Gerador & Editor de Imagens
            </h1>
            <p className="mt-3 text-muted-foreground">
              Crie do zero (gratuito) ou edite uma imagem existente preservando o rosto.
            </p>
          </header>

          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar (grátis)
              </TabsTrigger>
              <TabsTrigger value="edit">
                <Wand2 className="mr-2 h-4 w-4" />
                Editar (grátis)
              </TabsTrigger>
              <TabsTrigger value="combine">
                <ImageIcon className="mr-2 h-4 w-4" />
                Combinar 2 imagens
              </TabsTrigger>
            </TabsList>

            {/* -------- ABA GERAR -------- */}
            <TabsContent value="generate" className="mt-6">
              <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                <Card className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prompt">Descrição da imagem</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(EXAMPLE_PROMPT);
                          setSeed("42");
                          setSizeIdx(0);
                          setModel("flux-realism");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Usar exemplo
                      </button>
                    </div>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex.: pôr do sol sobre montanhas nevadas, cinematográfico"
                      className="min-h-[140px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Formato</Label>
                      <Select
                        value={String(sizeIdx)}
                        onValueChange={(v) => setSizeIdx(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SIZES.map((s, i) => (
                            <SelectItem key={s.label} value={String(i)}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed (opcional)</Label>
                    <Input
                      id="seed"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="Vazio = aleatório"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Gerar imagem
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    100% gratuito · 0 créditos consumidos
                  </p>
                </Card>

                <Card className="flex min-h-[420px] items-center justify-center overflow-hidden p-4">
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Criando sua imagem...</p>
                    </div>
                  ) : imageUrl ? (
                    <div className="flex w-full flex-col gap-4">
                      <img
                        src={imageUrl}
                        alt={prompt}
                        className="w-full rounded-md object-contain"
                      />
                      <Button
                        onClick={() => downloadAsJpg(imageUrl).catch(() => toast.error("Falha"))}
                        variant="secondary"
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" /> Baixar JPG
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                      <p className="text-sm">Sua imagem aparecerá aqui</p>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* -------- ABA EDITAR (img2img) -------- */}
            <TabsContent value="edit" className="mt-6">
              <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Modo <strong>img2img</strong> usa <strong>Stable Diffusion XL Refiner</strong> via
                  Hugging Face Inference API (tier gratuito). <strong>0 créditos</strong> do Lovable AI.
                  Pode haver espera de ~30s no primeiro uso (cold start) e rate limit do HF se usado em excesso.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                <Card className="space-y-4 p-5">
                  <div className="space-y-2">
                    <Label>Imagem de referência</Label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {sourceDataUrl ? "Trocar imagem" : "Enviar imagem"}
                    </Button>
                    {sourceDataUrl && (
                      <img
                        src={sourceDataUrl}
                        alt="referência"
                        className="mt-2 max-h-40 w-full rounded-md object-contain"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-prompt">Instrução de edição</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPrompt(EXAMPLE_EDIT_PROMPT);
                          setNegativePrompt(EXAMPLE_NEGATIVE);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Usar exemplo
                      </button>
                    </div>
                    <Textarea
                      id="edit-prompt"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Ex.: mantenha a pessoa igual, troque só o fundo por um escritório moderno"
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="negative">Negative prompt (opcional)</Label>
                    <Textarea
                      id="negative"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Ex.: rosto deformado, pessoa diferente, borrado"
                      className="min-h-[70px]"
                    />
                  </div>

                  <Button
                    onClick={handleEdit}
                    disabled={editing || !sourceDataUrl}
                    className="w-full"
                    size="lg"
                  >
                    {editing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Editando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" /> Editar imagem
                      </>
                    )}
                  </Button>
                </Card>

                <Card className="flex min-h-[420px] items-center justify-center overflow-hidden p-4">
                  {editing ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Aplicando edição...</p>
                    </div>
                  ) : editedUrl ? (
                    <div className="flex w-full flex-col gap-4">
                      <img
                        src={editedUrl}
                        alt={editPrompt}
                        className="w-full rounded-md object-contain"
                      />
                      <Button
                        onClick={() => downloadAsJpg(editedUrl).catch(() => toast.error("Falha"))}
                        variant="secondary"
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" /> Baixar JPG
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Wand2 className="h-10 w-10" />
                      <p className="text-sm">A imagem editada aparecerá aqui</p>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* -------- ABA COMBINAR 2 IMAGENS -------- */}
            <TabsContent value="combine" className="mt-6">
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p>
                  Modo <strong>Combinar 2 imagens</strong> usa o Nano Banana (Gemini Flash Image)
                  via Lovable AI — único modelo que aceita 2 imagens.{" "}
                  <strong>Consome créditos do Lovable AI</strong> ($1 grátis/mês, depois pré-pago).
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                <Card className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Foto base (criativo)</Label>
                      <input
                        ref={baseFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) readFileToDataUrl(f, setBaseImg);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => baseFileRef.current?.click()}
                        className="w-full"
                        size="sm"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {baseImg ? "Trocar" : "Enviar"}
                      </Button>
                      {baseImg && (
                        <img
                          src={baseImg}
                          alt="base"
                          className="mt-1 h-28 w-full rounded-md object-cover"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Foto de referência</Label>
                      <input
                        ref={refFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) readFileToDataUrl(f, setRefImg);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => refFileRef.current?.click()}
                        className="w-full"
                        size="sm"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {refImg ? "Trocar" : "Enviar"}
                      </Button>
                      {refImg && (
                        <img
                          src={refImg}
                          alt="ref"
                          className="mt-1 h-28 w-full rounded-md object-cover"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="combine-prompt">Como combinar</Label>
                    <Textarea
                      id="combine-prompt"
                      value={combinePrompt}
                      onChange={(e) => setCombinePrompt(e.target.value)}
                      placeholder="Ex.: mantenha o rosto/pessoa da Imagem 1 e use o estilo/fundo da Imagem 2"
                      className="min-h-[120px]"
                    />
                  </div>

                  <Button
                    onClick={handleCombine}
                    disabled={combining || !baseImg || !refImg}
                    className="w-full"
                    size="lg"
                  >
                    {combining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Combinando...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" /> Combinar imagens
                      </>
                    )}
                  </Button>
                </Card>

                <Card className="flex min-h-[420px] flex-col p-4">
                  {combining ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Gerando + recortando 4 formatos...</p>
                    </div>
                  ) : variants && combinedUrl ? (
                    <div className="flex w-full flex-col gap-3">
                      <Tabs
                        value={activeVariant}
                        onValueChange={(v) => setActiveVariant(v as SocialFormat["key"])}
                      >
                        <TabsList className="grid w-full grid-cols-4">
                          {SOCIAL_FORMATS.map((f) => (
                            <TabsTrigger key={f.key} value={f.key} className="text-xs">
                              {f.key === "reels" && "Reels"}
                              {f.key === "feed" && "Feed"}
                              {f.key === "story" && "Story"}
                              {f.key === "landscape" && "FB"}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {SOCIAL_FORMATS.map((f) => (
                          <TabsContent key={f.key} value={f.key} className="mt-3">
                            <div className="flex flex-col items-center gap-2">
                              <img
                                src={variants[f.key]}
                                alt={f.label}
                                className="max-h-[340px] rounded-md border border-border object-contain"
                              />
                              <p className="text-xs text-muted-foreground">{f.label}</p>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            downloadDataUrl(
                              variants[activeVariant],
                              `${activeVariant}-${Date.now()}.jpg`,
                            )
                          }
                        >
                          <Download className="mr-2 h-4 w-4" /> Baixar este formato
                        </Button>
                        <Button onClick={() => scheduleVariant(activeVariant)}>
                          <CalendarClock className="mr-2 h-4 w-4" /> Agendar postagem
                        </Button>
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        💡 1 geração = 4 formatos. Crop client-side, sem créditos extras.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                      <p className="text-sm">O resultado aparecerá aqui</p>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
}

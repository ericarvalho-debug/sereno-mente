import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MODELS = ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"];
const SIZES = [
  { label: "Quadrado (1024×1024)", w: 1024, h: 1024 },
  { label: "Paisagem (1280×720)", w: 1280, h: 720 },
  { label: "Retrato (720×1280)", w: 720, h: 1280 },
  { label: "Wide (1536×640)", w: 1536, h: 640 },
];

export default function ImageGen() {
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
      const usedSeed = seed.trim() || Math.floor(Math.random() * 1_000_000).toString();
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
      )}?width=${size.w}&height=${size.h}&model=${model}&seed=${usedSeed}&nologo=true`;

      // Pré-carrega para validar e exibir
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem"));
        img.src = url;
      });
      setImageUrl(url);
      toast.success("Imagem gerada!");
    } catch (e) {
      toast.error("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      // Converte para JPG via canvas
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
          if (!jpgBlob) return;
          const link = document.createElement("a");
          const objectUrl = URL.createObjectURL(jpgBlob);
          link.href = objectUrl;
          link.download = `imagem-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
        },
        "image/jpeg",
        0.95
      );
    } catch {
      toast.error("Falha ao baixar a imagem");
    }
  };

  return (
    <Layout>
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/40 px-4 py-1.5 text-sm text-secondary-foreground">
              <Sparkles className="h-4 w-4" />
              100% gratuito · sem cadastro · sem chave de API
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Gerador de Imagens com IA
            </h1>
            <p className="mt-3 text-muted-foreground">
              Descreva o que você imagina e a IA cria. Powered by Pollinations.ai (Flux).
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <Card className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Descrição da imagem</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex.: um pôr do sol sobre montanhas nevadas, estilo cinematográfico"
                  className="min-h-[140px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={String(sizeIdx)} onValueChange={(v) => setSizeIdx(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIZES.map((s, i) => (
                        <SelectItem key={s.label} value={String(i)}>{s.label}</SelectItem>
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
                  placeholder="Deixe vazio para aleatório"
                />
              </div>

              <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar imagem</>
                )}
              </Button>
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
                  <Button onClick={handleDownload} variant="secondary" className="w-full">
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
        </div>
      </section>
    </Layout>
  );
}

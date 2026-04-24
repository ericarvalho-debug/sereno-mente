import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarClock,
  Trash2,
  Instagram,
  Facebook,
  Music2,
  AlertTriangle,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

type Platform = "instagram" | "facebook" | "tiktok";

type ScheduledPost = {
  id: string;
  platforms: string[];
  caption: string;
  image_url: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed" | "cancelled";
  error_message: string | null;
};

const PLATFORMS: { id: Platform; label: string; icon: typeof Instagram }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "tiktok", label: "TikTok", icon: Music2 },
];

function statusBadge(status: ScheduledPost["status"]) {
  const map: Record<ScheduledPost["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Agendado", variant: "secondary" },
    posted: { label: "Publicado", variant: "default" },
    failed: { label: "Falhou", variant: "destructive" },
    cancelled: { label: "Cancelado", variant: "outline" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function Schedule() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(["instagram"]));
  const [creating, setCreating] = useState(false);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Recupera imagem + legenda vindas da página de gerador (se houver)
  useEffect(() => {
    const pendingImg = sessionStorage.getItem("pending_post_image");
    const pendingCap = sessionStorage.getItem("pending_post_caption");
    if (pendingImg) {
      setImageUrl(pendingImg);
      sessionStorage.removeItem("pending_post_image");
    }
    if (pendingCap) {
      setCaption(pendingCap);
      sessionStorage.removeItem("pending_post_caption");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) {
      toast.error("Falha ao carregar agendamentos");
    } else {
      setPosts((data || []) as ScheduledPost[]);
    }
    setLoading(false);
  };

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!imageUrl) return toast.error("Imagem obrigatória");
    if (!scheduledAt) return toast.error("Defina data e hora");
    if (platforms.size === 0) return toast.error("Escolha ao menos 1 plataforma");
    const when = new Date(scheduledAt);
    if (when.getTime() <= Date.now()) return toast.error("Horário precisa ser futuro");

    setCreating(true);
    const { error } = await supabase.from("scheduled_posts").insert({
      user_id: user.id,
      image_url: imageUrl,
      caption,
      scheduled_at: when.toISOString(),
      platforms: Array.from(platforms),
      status: "pending",
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Postagem agendada!");
      setImageUrl("");
      setCaption("");
      setScheduledAt("");
      void loadPosts();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removido");
      setPosts((p) => p.filter((x) => x.id !== id));
    }
  };

  return (
    <Layout>
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/40 px-4 py-1.5 text-sm text-secondary-foreground">
              <CalendarClock className="h-4 w-4" />
              Agendamento de postagens sociais
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Agendar Postagens
            </h1>
            <p className="mt-3 text-muted-foreground">
              Programe publicações para Instagram, Facebook e TikTok.
            </p>
          </header>

          {/* Aviso sobre integração real */}
          <div className="mb-6 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Esta tela já <strong>salva e gerencia</strong> seus agendamentos. A publicação
              automática nas redes requer conectar uma integração externa (ex.:{" "}
              <strong>Ayrshare</strong> — plano gratuito 20 posts/mês cobre IG/FB/TikTok com 1
              token único, evitando o App Review da Meta). Posso ativar quando você criar a
              conta e me passar a chave.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            {/* Form */}
            <Card className="space-y-4 p-5">
              <div className="space-y-2">
                <Label>Imagem (URL ou data:)</Label>
                {imageUrl ? (
                  <div className="space-y-2">
                    <img
                      src={imageUrl}
                      alt="prévia"
                      className="max-h-48 w-full rounded-md border border-border object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageUrl("")}
                      className="w-full"
                    >
                      Remover imagem
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                    <LinkIcon className="h-4 w-4" />
                    Use o gerador para enviar uma imagem ou cole abaixo.
                  </div>
                )}
                <Input
                  value={imageUrl.startsWith("data:") ? "" : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Legenda</Label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Texto + hashtags"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Plataformas</Label>
                <div className="space-y-2">
                  {PLATFORMS.map(({ id, label, icon: Icon }) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-2 hover:bg-accent"
                    >
                      <Checkbox
                        checked={platforms.has(id)}
                        onCheckedChange={() => togglePlatform(id)}
                      />
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreate} disabled={creating} className="w-full" size="lg">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Agendando...
                  </>
                ) : (
                  <>
                    <CalendarClock className="mr-2 h-4 w-4" /> Agendar postagem
                  </>
                )}
              </Button>
            </Card>

            {/* Lista */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Próximos agendamentos</h2>
              {loading ? (
                <Card className="flex items-center justify-center p-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </Card>
              ) : posts.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma postagem agendada ainda.
                </Card>
              ) : (
                posts.map((p) => (
                  <Card key={p.id} className="flex gap-3 p-3">
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-md border border-border object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {statusBadge(p.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.scheduled_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.platforms.map((pl) => (
                          <Badge key={pl} variant="outline" className="text-[10px]">
                            {pl}
                          </Badge>
                        ))}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {p.caption || <em>(sem legenda)</em>}
                      </p>
                      {p.error_message && (
                        <p className="text-xs text-destructive">{p.error_message}</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

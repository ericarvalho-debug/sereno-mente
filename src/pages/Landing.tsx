import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Video, 
  MessageCircle, 
  Calendar, 
  Shield, 
  Users,
  ArrowRight,
  CheckCircle2,
  Star
} from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Videochamadas Seguras',
    description: 'Sessões ao vivo com qualidade e privacidade garantidas.',
  },
  {
    icon: MessageCircle,
    title: 'Chat Entre Sessões',
    description: 'Mantenha contato com seu terapeuta sempre que precisar.',
  },
  {
    icon: Calendar,
    title: 'Agendamento Fácil',
    description: 'Escolha horários que funcionam para você, sem complicações.',
  },
  {
    icon: Shield,
    title: 'Privacidade Total',
    description: 'Seus dados são protegidos com criptografia de ponta.',
  },
];

const testimonials = [
  {
    name: 'Maria S.',
    role: 'Paciente',
    content: 'A plataforma mudou minha vida. Finalmente encontrei um terapeuta que me entende.',
    rating: 5,
  },
  {
    name: 'Dr. Carlos M.',
    role: 'Psicólogo',
    content: 'Ferramenta incrível para gerenciar minha prática e ajudar mais pessoas.',
    rating: 5,
  },
  {
    name: 'Ana L.',
    role: 'Paciente',
    content: 'A facilidade de agendar e fazer as sessões de casa fez toda a diferença.',
    rating: 5,
  },
];

const benefits = [
  'Profissionais certificados e verificados',
  'Sessões no conforto da sua casa',
  'Preços acessíveis e transparentes',
  'Cancelamento flexível',
  'Suporte 24/7',
  'Primeira consulta com desconto',
];

export default function Landing() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
              <Heart className="h-4 w-4" />
              Cuidado com sua saúde mental
            </div>
            
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Terapia online de qualidade, 
              <span className="text-primary"> quando você precisar</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Conectamos você a psicólogos e terapeutas qualificados. 
              Sessões por vídeo, chat e muito mais, tudo em um só lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link to="/therapists">
                <Button size="lg" className="gradient-primary text-primary-foreground gap-2 text-lg px-8">
                  Encontrar Terapeuta
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup&role=therapist">
                <Button size="lg" variant="outline" className="gap-2 text-lg px-8">
                  <Users className="h-5 w-5" />
                  Sou Terapeuta
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 pt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Terapeutas</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">10k+</p>
                <p className="text-sm text-muted-foreground">Sessões</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">4.9</p>
                <p className="text-sm text-muted-foreground">Avaliação</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Tudo que você precisa para sua jornada
            </h2>
            <p className="text-lg text-muted-foreground">
              Uma plataforma completa pensada para o seu bem-estar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group border-0 shadow-card hover:shadow-glow transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold">
                Por que escolher a MindCare?
              </h2>
              <p className="text-lg text-muted-foreground">
                Criamos um ambiente seguro e acolhedor para você iniciar ou continuar 
                sua jornada de autoconhecimento e bem-estar.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-primary text-primary-foreground gap-2">
                  Começar Agora
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-sage-light to-peach overflow-hidden shadow-card">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Heart className="h-24 w-24 text-primary mx-auto mb-6 animate-float" />
                    <p className="text-2xl font-heading font-semibold text-foreground">
                      Sua saúde mental importa
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              O que dizem sobre nós
            </h2>
            <p className="text-lg text-muted-foreground">
              Histórias reais de pessoas que transformaram suas vidas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="border-0 shadow-card animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">
              Pronto para começar sua jornada?
            </h2>
            <p className="text-lg text-muted-foreground">
              Dê o primeiro passo hoje. Encontre um terapeuta que combina com você.
            </p>
            <Link to="/therapists">
              <Button size="lg" className="gradient-primary text-primary-foreground gap-2 text-lg px-8">
                Encontrar Meu Terapeuta
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

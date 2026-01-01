import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  MessageCircle, 
  Video, 
  Clock, 
  Search,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Session {
  id: string;
  scheduled_at: string;
  duration: number;
  status: string;
  therapist_id: string;
  therapist_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

export default function PatientDashboard() {
  const { user, loading: authLoading, role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'patient')) {
      navigate('/auth');
    }
  }, [user, authLoading, role, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch upcoming sessions
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', user.id)
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (sessionsData) {
      // Fetch therapist profiles for each session
      const sessionsWithProfiles = await Promise.all(
        sessionsData.map(async (session) => {
          const { data: therapistProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.therapist_id)
            .single();

          return {
            ...session,
            therapist_profile: therapistProfile,
          };
        })
      );
      setUpcomingSessions(sessionsWithProfiles as Session[]);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-primary/10 text-primary">Agendada</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500/10 text-green-600">Em Andamento</Badge>;
      case 'completed':
        return <Badge variant="secondary">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <Layout showFooter={false}>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
        <div className="container py-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">
                  Olá, {profile?.full_name?.split(' ')[0] || 'Paciente'}! 👋
                </h1>
                <p className="text-muted-foreground">
                  Como você está se sentindo hoje?
                </p>
              </div>
            </div>
            <Link to="/therapists">
              <Button className="gap-2 gradient-primary text-primary-foreground">
                <Search className="h-4 w-4" />
                Encontrar Terapeuta
              </Button>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Agendar Sessão</span>
              </CardContent>
            </Card>
            <Link to="/messages" className="block">
              <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group h-full">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-xl bg-accent/50 flex items-center justify-center mb-3 group-hover:bg-accent transition-colors">
                    <MessageCircle className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <span className="text-sm font-medium">Mensagens</span>
                </CardContent>
              </Card>
            </Link>
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-secondary/80 transition-colors">
                  <Video className="h-6 w-6 text-secondary-foreground" />
                </div>
                <span className="text-sm font-medium">Sala de Vídeo</span>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-peach flex items-center justify-center mb-3 group-hover:bg-peach-dark/30 transition-colors">
                  <CalendarDays className="h-6 w-6 text-peach-dark" />
                </div>
                <span className="text-sm font-medium">Histórico</span>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Sessions */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading">Próximas Sessões</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todas
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Você não tem sessões agendadas.
                  </p>
                  <Link to="/therapists">
                    <Button variant="outline">
                      Agendar Primeira Sessão
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={session.therapist_profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {session.therapist_profile?.full_name?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {session.therapist_profile?.full_name || 'Terapeuta'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(session.scheduled_at), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                      {session.status === 'scheduled' && (
                        <Button size="sm" className="gap-2">
                          <Video className="h-4 w-4" />
                          Entrar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

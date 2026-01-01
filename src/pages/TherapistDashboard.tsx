import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users,
  DollarSign,
  TrendingUp,
  Settings,
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
  price: number;
  patient_id: string;
  patient_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

interface Stats {
  totalSessions: number;
  monthlyEarnings: number;
  totalPatients: number;
}

export default function TherapistDashboard() {
  const { user, loading: authLoading, role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, monthlyEarnings: 0, totalPatients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'therapist')) {
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
      .eq('therapist_id', user.id)
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (sessionsData) {
      const sessionsWithProfiles = await Promise.all(
        sessionsData.map(async (session) => {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.patient_id)
            .single();

          return {
            ...session,
            patient_profile: patientProfile,
          };
        })
      );
      setUpcomingSessions(sessionsWithProfiles as Session[]);
    }

    // Fetch stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyData } = await supabase
      .from('sessions')
      .select('price')
      .eq('therapist_id', user.id)
      .eq('status', 'completed')
      .gte('scheduled_at', startOfMonth.toISOString());

    const { data: allSessionsData } = await supabase
      .from('sessions')
      .select('patient_id')
      .eq('therapist_id', user.id);

    const uniquePatients = new Set(allSessionsData?.map(s => s.patient_id) || []);
    
    setStats({
      totalSessions: allSessionsData?.length || 0,
      monthlyEarnings: monthlyData?.reduce((sum, s) => sum + Number(s.price), 0) || 0,
      totalPatients: uniquePatients.size,
    });

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-primary/10 text-primary">Agendada</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500/10 text-green-600">Em Andamento</Badge>;
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
      <div className="min-h-screen bg-gradient-to-b from-peach/30 to-background">
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
                  Olá, Dr(a). {profile?.full_name?.split(' ')[0] || 'Terapeuta'}! 👋
                </h1>
                <p className="text-muted-foreground">
                  Veja sua agenda de hoje
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurar Perfil
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Sessões</p>
                    <p className="text-3xl font-bold">{stats.totalSessions}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>+12% este mês</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ganhos do Mês</p>
                    <p className="text-3xl font-bold">R$ {stats.monthlyEarnings.toFixed(2)}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-accent/50 flex items-center justify-center">
                    <DollarSign className="h-7 w-7 text-accent-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>+8% vs mês anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pacientes</p>
                    <p className="text-3xl font-bold">{stats.totalPatients}</p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <Users className="h-7 w-7 text-secondary-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>+5 novos este mês</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Minha Agenda</span>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-accent/50 flex items-center justify-center mb-3 group-hover:bg-accent transition-colors">
                  <MessageCircle className="h-6 w-6 text-accent-foreground" />
                </div>
                <span className="text-sm font-medium">Mensagens</span>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-3 group-hover:bg-secondary/80 transition-colors">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
                <span className="text-sm font-medium">Pacientes</span>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft hover:shadow-card transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-peach flex items-center justify-center mb-3 group-hover:bg-peach-dark/30 transition-colors">
                  <Clock className="h-6 w-6 text-peach-dark" />
                </div>
                <span className="text-sm font-medium">Disponibilidade</span>
              </CardContent>
            </Card>
          </div>

          {/* Today's Sessions */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading">Próximas Sessões</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver agenda completa
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem sessões agendadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={session.patient_profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {session.patient_profile?.full_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {session.patient_profile?.full_name || 'Paciente'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(session.scheduled_at), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                      <Button size="sm" className="gap-2 gradient-primary text-primary-foreground">
                        <Video className="h-4 w-4" />
                        Iniciar
                      </Button>
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

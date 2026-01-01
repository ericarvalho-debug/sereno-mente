import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Search, Star, Clock, DollarSign, Filter } from 'lucide-react';

interface Therapist {
  id: string;
  user_id: string;
  specialties: string[];
  crp: string;
  education: string;
  experience_years: number;
  session_price: number;
  session_duration: number;
  is_available: boolean;
  profile: {
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
  } | null;
}

export default function TherapistList() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    const { data, error } = await supabase
      .from('therapist_profiles')
      .select(`
        *,
        profile:profiles!therapist_profiles_user_id_fkey(full_name, avatar_url, bio)
      `)
      .eq('is_available', true);

    if (!error && data) {
      setTherapists(data as unknown as Therapist[]);
    }
    setLoading(false);
  };

  const filteredTherapists = therapists.filter((therapist) => {
    const name = therapist.profile?.full_name?.toLowerCase() || '';
    const specialties = therapist.specialties?.join(' ').toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || specialties.includes(query);
  });

  return (
    <Layout>
      <div className="bg-gradient-to-b from-sage-light/50 to-background">
        <div className="container py-12">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Encontre seu terapeuta ideal
            </h1>
            <p className="text-muted-foreground text-lg">
              Profissionais qualificados prontos para ajudar você
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou especialidade..."
                className="pl-12 h-12 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2">
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              {loading ? 'Carregando...' : `${filteredTherapists.length} terapeutas encontrados`}
            </p>
          </div>

          {/* Therapist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="border-0 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full mt-4" />
                    <div className="flex gap-2 mt-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredTherapists.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Nenhum terapeuta encontrado com esses critérios.
                </p>
              </div>
            ) : (
              filteredTherapists.map((therapist) => (
                <Card 
                  key={therapist.id} 
                  className="border-0 shadow-card hover:shadow-glow transition-all duration-300 group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/10">
                        <AvatarImage src={therapist.profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {therapist.profile?.full_name?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-lg truncate">
                          {therapist.profile?.full_name || 'Terapeuta'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          CRP: {therapist.crp || 'Não informado'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="text-sm font-medium">4.9</span>
                          <span className="text-sm text-muted-foreground">(24)</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                      {therapist.profile?.bio || therapist.education || 'Profissional dedicado ao seu bem-estar.'}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {therapist.specialties?.slice(0, 3).map((specialty, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {(therapist.specialties?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{therapist.specialties.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {therapist.session_duration}min
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          R${therapist.session_price}
                        </div>
                      </div>
                      <Link to={`/therapist/${therapist.user_id}`}>
                        <Button size="sm" className="gradient-primary text-primary-foreground">
                          Ver Perfil
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

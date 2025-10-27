import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserEditDialog } from "@/components/UserEditDialog";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  team_id: string | null;
  region_id: string | null;
  teams: { name: string } | null;
  regions: { name: string } | null;
  user_roles: Array<{ role: string }>;
}

const UsersManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          *,
          teams(name),
          regions(name)
        `)
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        user_roles: (allRoles || [])
          .filter((role) => role.user_id === profile.id)
          .map((role) => ({ role: role.role })),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingUser(null);
    fetchUsers();
  };

  const roleLabels: Record<string, string> = {
    member: "Membro",
    team_admin: "Admin Equipe",
    regional_admin: "Admin Regional",
    global_admin: "Admin Global",
  };

  const roleColors: Record<string, string> = {
    member: "bg-secondary text-secondary-foreground",
    team_admin: "bg-accent text-accent-foreground",
    regional_admin: "bg-warning text-warning-foreground",
    global_admin: "bg-primary text-primary-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie usuários, equipes e permissões
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        ) : (
          users.map((userProfile) => (
            <Card key={userProfile.id} className="shadow-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{userProfile.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {userProfile.teams && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Equipe: </span>
                    <span className="font-medium">{userProfile.teams.name}</span>
                  </div>
                )}
                {userProfile.regions && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Região: </span>
                    <span className="font-medium">{userProfile.regions.name}</span>
                  </div>
                )}
                {userProfile.user_roles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {userProfile.user_roles.map((roleObj, idx) => (
                      <Badge
                        key={idx}
                        className={roleColors[roleObj.role] || "bg-secondary"}
                      >
                        {roleLabels[roleObj.role] || roleObj.role}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleEdit(userProfile)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <UserEditDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        user={editingUser}
      />
    </div>
  );
};

export default UsersManagement;

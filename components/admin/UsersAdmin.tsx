"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api/fetcher";
import { ROLE_LABELS } from "@/lib/workflow/permissions";
import type { UserRole } from "@/types/database";
import { formatDate } from "@/lib/utils/format";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const result = await apiRequest<{ users: UserRow[] }>("/api/admin/users");
    if (result.ok && result.data) setUsers(result.data.users);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      <NewUserForm onCreated={load} />

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserRowItem key={u.id} user={u} onChanged={load} />
            ))}
            {loaded && users.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum usuário cadastrado.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewUserForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("comercial");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Preencha nome, e-mail e uma senha com ao menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const result = await apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify({ name, email, role, password }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao criar usuário.");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setSuccess("Usuário criado com sucesso.");
    await onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo usuário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select label="Perfil" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input label="Senha provisória" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button onClick={handleSubmit} loading={loading}>
          Criar usuário
        </Button>
      </CardContent>
    </Card>
  );
}

function UserRowItem({ user, onChanged }: { user: UserRow; onChanged: () => Promise<void> }) {
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);

  async function updateRole(newRole: UserRole) {
    setRole(newRole);
    setLoading(true);
    await apiRequest(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
    setLoading(false);
    await onChanged();
  }

  async function toggleActive() {
    setLoading(true);
    await apiRequest(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) });
    setLoading(false);
    await onChanged();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{user.name}</p>
        <p className="text-xs text-slate-500">
          {user.email} · desde {formatDate(user.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!user.active && <Badge className="border-rose-200 bg-rose-100 text-rose-700">Inativo</Badge>}
        <Select value={role} disabled={loading} onChange={(e) => updateRole(e.target.value as UserRole)} className="w-auto">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button size="sm" variant={user.active ? "outline" : "secondary"} onClick={toggleActive} disabled={loading}>
          {user.active ? "Desativar" : "Ativar"}
        </Button>
      </div>
    </div>
  );
}

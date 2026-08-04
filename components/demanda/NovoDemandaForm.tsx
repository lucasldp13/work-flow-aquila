"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ClientPicker, ClientOption } from "./ClientPicker";
import { ConsultorPicker } from "./ConsultorPicker";
import { ContatosField, ContatoFormValue } from "./ContatosField";
import { isValidCnpj } from "@/lib/workflow/validations";

export function NovoDemandaForm() {
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCnpj, setNewClientCnpj] = useState("");

  const [nomeDemanda, setNomeDemanda] = useState("");
  const [consultorNome, setConsultorNome] = useState("");
  const [consultorEmail, setConsultorEmail] = useState("");
  const [consultorCategoria, setConsultorCategoria] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [markup, setMarkup] = useState("");
  const [escopo, setEscopo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [signatarioEmail, setSignatarioEmail] = useState("");
  const [contatos, setContatos] = useState<ContatoFormValue[]>([]);
  const [proposta, setProposta] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!selectedClient && (!newClientName.trim() || !isValidCnpj(newClientCnpj))) {
      setError("Selecione um cliente existente ou informe nome e CNPJ válidos para um novo cliente.");
      return;
    }
    if (!nomeDemanda.trim() || !consultorNome.trim() || !consultorEmail.trim()) {
      setError("Preencha nome da demanda, nome e e-mail do consultor.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          clientName: selectedClient ? undefined : newClientName,
          clientCnpj: selectedClient ? undefined : newClientCnpj,
          nomeDemanda,
          consultorNome,
          consultorEmail,
          valor: valor ? Number(valor) : null,
          markup: markup ? Number(markup) : null,
          escopo,
          prazo: prazo || undefined,
          contatos: contatos.filter((c) => c.nome && c.email),
          signatarioEmail: signatarioEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível cadastrar a demanda.");
        setLoading(false);
        return;
      }

      const demandId = data.demand.id as string;

      if (proposta) {
        const formData = new FormData();
        formData.append("file", proposta);
        formData.append("tipo", "proposta");
        await fetch(`/api/demands/${demandId}/documents`, { method: "POST", body: formData });
      }

      router.push(`/demandas/${demandId}`);
      router.refresh();
    } catch {
      setError("Erro inesperado ao cadastrar a demanda.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Cliente e demanda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientPicker
            selected={selectedClient}
            onSelect={setSelectedClient}
            newClientName={newClientName}
            newClientCnpj={newClientCnpj}
            onNewClientChange={(name, cnpj) => {
              setNewClientName(name);
              setNewClientCnpj(cnpj);
            }}
          />
          <Input label="Nome da demanda / projeto" required value={nomeDemanda} onChange={(e) => setNomeDemanda(e.target.value)} placeholder="Ex.: Diagnóstico organizacional 2026" />
          <ConsultorPicker
            nome={consultorNome}
            email={consultorEmail}
            categoria={consultorCategoria}
            onChange={({ nome, email, categoria }) => {
              setConsultorNome(nome);
              setConsultorEmail(email);
              setConsultorCategoria(categoria);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condições comerciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Valor (R$)" type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            <Input label="Markup (%)" type="number" step="0.01" value={markup} onChange={(e) => setMarkup(e.target.value)} />
            <Input label="Prazo de execução" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <Textarea label="Escopo" value={escopo} onChange={(e) => setEscopo(e.target.value)} placeholder="Descreva o escopo do projeto…" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contatos e assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContatosField value={contatos} onChange={setContatos} />
          <Input
            label="E-mail do responsável pela assinatura"
            type="email"
            hint="Pode ser confirmado/ajustado depois, antes do envio da minuta."
            value={signatarioEmail}
            onChange={(e) => setSignatarioEmail(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposta recebida do consultor</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => setProposta(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="mt-1 text-xs text-slate-500">Você também pode anexar a proposta depois, na página da demanda.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Cadastrar demanda
        </Button>
      </div>
    </form>
  );
}

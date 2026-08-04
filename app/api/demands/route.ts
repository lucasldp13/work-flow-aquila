import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError, appUrl } from "@/lib/api/helpers";
import { notifyJuridico } from "@/lib/email/notify";
import { isValidCnpj } from "@/lib/workflow/validations";
import { calcularValorBruto } from "@/lib/workflow/pricing";

const contatoSchema = z.object({
  nome: z.string().min(1),
  cargo: z.string().optional(),
  email: z.string().email(),
  telefone: z.string().optional(),
});

const createDemandSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientName: z.string().min(1).optional(),
  clientCnpj: z.string().optional(),
  nomeDemanda: z.string().min(1, "Informe o nome da demanda/projeto."),
  consultorNome: z.string().min(1, "Informe o nome do consultor."),
  consultorEmail: z.string().email("E-mail do consultor inválido."),
  valor: z.number().nonnegative().nullable().optional(),
  markup: z.number().nullable().optional(),
  escopo: z.string().optional(),
  prazo: z.string().optional(),
  contatos: z.array(contatoSchema).default([]),
  signatarioEmail: z.string().email().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireProfile();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("q");

    let query = supabase
      .from("demands")
      .select("*, clients(id, name, cnpj), comercial:profiles!demands_comercial_responsavel_id_fkey(id, name)")
      .order("updated_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (search) query = query.or(`nome_demanda.ilike.%${search}%,consultor_nome.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ demands: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["comercial"]);

    const body = createDemandSchema.parse(await request.json());

    if (!body.clientId && (!body.clientName || !isValidCnpj(body.clientCnpj))) {
      return NextResponse.json({ error: "Informe um cliente existente ou nome + CNPJ válido para criar um novo cliente." }, { status: 400 });
    }

    let clientId = body.clientId;
    if (!clientId) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({ name: body.clientName!, cnpj: body.clientCnpj!, created_by: profile.id })
        .select("id")
        .single();
      if (clientError) throw clientError;
      clientId = client.id;
    }

    const { valorBruto } = calcularValorBruto(body.valor ?? null, body.markup ?? null);

    const { data: demand, error } = await supabase
      .from("demands")
      .insert({
        client_id: clientId,
        nome_demanda: body.nomeDemanda,
        consultor_nome: body.consultorNome,
        consultor_email: body.consultorEmail,
        valor: body.valor ?? null,
        markup: body.markup ?? null,
        valor_bruto: valorBruto,
        escopo: body.escopo ?? null,
        prazo: body.prazo || null,
        contatos: body.contatos,
        signatario_email: body.signatarioEmail || null,
        status: "recebida_comercial",
        comercial_responsavel_id: profile.id,
        created_by: profile.id,
      })
      .select("*, clients(name)")
      .single();

    if (error) throw error;

    await supabase.from("demand_status_history").insert({
      demand_id: demand.id,
      status_anterior: null,
      status_novo: "recebida_comercial",
      usuario_id: profile.id,
    });

    await notifyJuridico({
      demandId: demand.id,
      actionKey: `cadastro:${demand.id}`,
      cliente: (demand as unknown as { clients: { name: string } | null }).clients?.name ?? body.clientName ?? "",
      demanda: demand.nome_demanda,
      usuarioComercial: profile.name,
      tipoAtualizacao: "Nova demanda cadastrada pelo Comercial",
      link: appUrl(`/demandas/${demand.id}`),
      createdBy: profile.id,
    });

    return NextResponse.json({ demand }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}

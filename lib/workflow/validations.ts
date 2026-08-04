// Regras de validação do workflow, compartilhadas entre a interface
// (habilitar/desabilitar botões, mensagens de erro) e o backend (rotas de
// API), garantindo que a mesma regra nunca fique divergente entre os dois.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

export interface MinutaEnvioInput {
  minutaAnexada: boolean;
  signatarioEmail: string;
  confirmarEmail: string;
}

export interface MinutaEnvioCheck {
  liberado: boolean;
  pendencias: string[];
}

// Trava obrigatória do botão "Registrar envio da minuta": só habilita
// quando TODAS as condições abaixo forem satisfeitas. Retorna a lista de
// pendências para exibir uma mensagem clara ao usuário sobre o que falta.
export function checkMinutaEnvio(input: MinutaEnvioInput): MinutaEnvioCheck {
  const pendencias: string[] = [];

  if (!input.minutaAnexada) {
    pendencias.push("Anexe o documento da minuta antes de registrar o envio.");
  }

  const email = input.signatarioEmail?.trim() ?? "";
  const confirmacao = input.confirmarEmail?.trim() ?? "";

  if (!email) {
    pendencias.push("Informe o e-mail do responsável pela assinatura.");
  } else if (!isValidEmail(email)) {
    pendencias.push("O e-mail do responsável pela assinatura não é válido.");
  }

  if (!confirmacao) {
    pendencias.push('Preencha o campo "Confirmar e-mail".');
  } else if (email && confirmacao !== email) {
    pendencias.push('O campo "Confirmar e-mail" deve ser idêntico ao e-mail informado.');
  }

  return { liberado: pendencias.length === 0, pendencias };
}

// Prazo jurídico: soma dias úteis (pula sábado/domingo) ou dias corridos a
// partir de uma data de início, conforme a configuração do administrador.
export function calcularPrazoLimite(inicio: Date, dias: number, tipo: "uteis" | "corridos"): Date {
  const resultado = new Date(inicio);

  if (tipo === "corridos") {
    resultado.setDate(resultado.getDate() + dias);
    return resultado;
  }

  let diasRestantes = dias;
  while (diasRestantes > 0) {
    resultado.setDate(resultado.getDate() + 1);
    const diaDaSemana = resultado.getDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) {
      diasRestantes -= 1;
    }
  }
  return resultado;
}

export function isPrazoVencido(prazoLimite: string | Date | null | undefined): boolean {
  if (!prazoLimite) return false;
  const limite = new Date(prazoLimite);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  return limite.getTime() < hoje.getTime();
}

export function diasRestantes(prazoLimite: string | Date | null | undefined): number | null {
  if (!prazoLimite) return null;
  const limite = new Date(prazoLimite);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  return Math.round((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function isValidCnpj(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false;
  const digits = cnpj.replace(/\D/g, "");
  return digits.length === 14;
}

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

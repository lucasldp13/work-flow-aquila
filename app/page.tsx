import { redirect } from "next/navigation";

// O link principal do sistema sempre leva à tela de login — mesmo que o
// navegador ainda tenha uma sessão válida — para que o acesso nunca pule
// direto para a última tela aberta.
export default function Home() {
  redirect("/login");
}

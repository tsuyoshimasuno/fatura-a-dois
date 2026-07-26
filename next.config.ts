import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indicador de dev-mode (canto inferior esquerdo) é não-determinístico
  // (estado de compilação/avisos muda entre execuções) e nunca aparece em
  // produção -- desabilitado para a suíte de QA (Story 7.1) não gerar diff
  // de ruído nos screenshots de baseline. Mask via seletor foi tentado
  // primeiro mas o elemento (nextjs-portal) nem sempre existe a tempo de ser
  // mascarado, dependendo de quando o Next.js termina de detectar avisos.
  devIndicators: false,
};

export default nextConfig;

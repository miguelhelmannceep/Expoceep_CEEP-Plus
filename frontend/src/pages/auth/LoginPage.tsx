import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { AlertCircle, Lock, Mail, Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

// Ícone Oficial do Google
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// Logo Oficial do CEEP
const OfficialLogo = () => (
  <div className="flex justify-center mb-3">
    <div className="w-20 h-20 bg-white rounded-2xl p-1.5 shadow-md border border-slate-200/80 flex items-center justify-center">
      <img
        src="/logo-ceep.png"
        alt="CEEP Pedro Boaretto Neto"
        className="w-full h-full object-contain"
      />
    </div>
  </div>
);

interface LoginError {
  title: string;
  message: string;
}

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    if (!response.credential) {
      setError({
        title: "Não foi possível entrar",
        message: "Use uma conta institucional @escola.pr.gov.br autorizada para acessar a Área do Aluno.",
      });
      return;
    }

    setError(null);
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle(response.credential);
    } catch {
      setError({
        title: "Não foi possível entrar",
        message: "Use uma conta institucional @escola.pr.gov.br autorizada para acessar a Área do Aluno.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    let isMounted = true;
    let timerId: any = null;

    const setupGoogleButton = () => {
      if (!isMounted) return false;
      if (window.google?.accounts?.id && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleButtonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 320,
          });
          return true;
        } catch (e) {
          console.error("Erro ao inicializar Google Identity Services:", e);
        }
      }
      return false;
    };

    if (!setupGoogleButton()) {
      let attempts = 0;
      timerId = setInterval(() => {
        attempts++;
        if (setupGoogleButton() || attempts > 50) {
          clearInterval(timerId);
        }
      }, 150);
    }

    return () => {
      isMounted = false;
      if (timerId) clearInterval(timerId);
    };
  }, [googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = email.toLowerCase().trim();

    if (!emailClean || !password) {
      setError({
        title: "Não foi possível entrar",
        message: "Por favor, preencha o e-mail e a senha para continuar.",
      });
      return;
    }

    // Validação de e-mail institucional para alunos
    const isInstitutional = emailClean.endsWith("@escola.pr.gov.br");
    const isAdministrative = emailClean === "gestao@ceep.demo" || emailClean === "cantina@ceep.demo";

    if (!isInstitutional && !isAdministrative) {
      setError({
        title: "Não foi possível entrar",
        message: "Para acessar como aluno, é necessário utilizar uma conta institucional @escola.pr.gov.br.",
      });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(emailClean, password);
    } catch {
      setError({
        title: "Não foi possível entrar",
        message: "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8 antialiased">
      {/* Top Container */}
      <div className="w-full max-w-md my-auto">
        {/* Logo Oficial e Título CEEP+ */}
        <div className="text-center space-y-1 mb-5">
          <OfficialLogo />
          <h1 className="text-2xl font-black text-[#2d3661] tracking-tight">
            CEEP+
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Centro Estadual de Educação Profissional Pedro Boaretto Neto
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/80 overflow-hidden">
          {/* Linha institucional superior */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#2d3661] via-[#2d3661] to-[#4aaa3c]" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Bloco de Acesso Institucional Google (Exclusivo para ALUNO) */}
            <div className="space-y-2">
              <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
                {isGoogleLoading ? (
                  <div className="flex items-center space-x-2 text-xs text-slate-600 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2d3661]" />
                    <span className="font-medium">Validando conta institucional...</span>
                  </div>
                ) : googleClientId ? (
                  <div ref={googleButtonRef} className="flex justify-center w-full min-h-[44px]" />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setError({
                        title: "Não foi possível entrar",
                        message:
                          "Google Client ID não configurado no frontend. Configure VITE_GOOGLE_CLIENT_ID no arquivo frontend/.env.",
                      });
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#2d3661]/20"
                  >
                    <GoogleIcon />
                    <span>Entrar com Google</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-center text-slate-400 font-medium">
                Exclusivo para contas institucionais <span className="font-semibold text-slate-600">@escola.pr.gov.br</span>
              </p>
            </div>

            {/* Separador Visual */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                ou com e-mail e senha
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Mensagem de Erro Integrada Institucional */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-slate-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <p className="font-bold text-amber-900 text-xs">
                    {error.title}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {error.message}
                  </p>
                </div>
              </div>
            )}

            {/* Formulário Tradicional */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input E-mail */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="usuario@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 bg-slate-50/60 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/15 transition-all"
                  />
                </div>
              </div>

              {/* Input Senha */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 bg-slate-50/60 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/15 transition-all"
                  />
                </div>
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-[#2d3661] hover:bg-[#222949] active:bg-[#1b203a] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

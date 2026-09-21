import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { AlertCircle, Lock, Mail, Loader2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || "E-mail ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center px-4 py-8 antialiased">
      {/* Top Header Bar Accent */}
      <div className="w-full max-w-md pt-6 sm:pt-12">
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-lg font-bold text-[#2d3661] tracking-tight">
            Portal de Acesso Institucional
          </h1>
          <p className="text-xs text-slate-500">
            Informe suas credenciais para acessar os serviços escolares.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
          {/* Top Institutional Line Accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#2d3661] via-[#2d3661] to-[#4aaa3c]" />

          <div className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Email Input */}
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
                    placeholder="usuario@escola.pr.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 bg-slate-50/50 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/15 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-900 bg-slate-50/50 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/15 transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
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

      {/* Institutional Footer */}
      <footer className="text-center space-y-1 pt-6 pb-2 text-[11px] text-slate-400 max-w-xs mx-auto">
        <p className="font-medium text-slate-500">
          Centro Estadual de Educação Profissional Pedro Boaretto Neto
        </p>
        <p className="text-[10px] text-slate-400">
          Ambiente institucional autenticado e protegido.
        </p>
      </footer>
    </div>
  );
};

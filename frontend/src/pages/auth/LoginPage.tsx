import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/auth.service";
import type { DemoAccount } from "../../types";
import { Button } from "../../components/common/Button";
import { Sparkles, AlertCircle, ArrowRight } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    authService
      .getDemoAccounts()
      .then(setDemoAccounts)
      .catch(() => {
        setDemoAccounts([
          { label: "Aluno Demo", email: "aluno@ceep.demo", role: "ALUNO", descricao: "Acesso como estudante", turma: "3º C — DS" },
          { label: "Gestão Demo", email: "gestao@ceep.demo", role: "GESTAO", descricao: "Acesso administrativo" },
          { label: "Cantina Demo", email: "cantina@ceep.demo", role: "CANTINA", descricao: "Terminal de balcão" },
        ]);
      });
  }, []);

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
      setErrorMessage(err.message || "E-mail ou senha inválidos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo123");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-500/20 mb-2">
            <span className="text-2xl font-black tracking-wider text-slate-950">C+</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CEEP+</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Centro Estadual de Educação Profissional Pedro Boaretto Neto
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                placeholder="seu.email@ceep.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full mt-2 font-semibold"
            >
              Entrar no CEEP+
            </Button>
          </form>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-slate-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Contas de Demonstração
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Clique em uma conta abaixo para preenchimento rápido (senha: <code className="text-emerald-400">demo123</code>):
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleQuickLogin(account.email)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-left transition-all group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {account.label}
                    </span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                      {account.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{account.descricao}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          Protótipo CEEP+ — Desenvolvido para a ExpoCEEP
        </p>
      </div>
    </div>
  );
};

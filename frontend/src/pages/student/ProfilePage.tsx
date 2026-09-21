import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { User as UserIcon, Mail, BookOpen, School, LogOut, ShieldCheck, AlertCircle } from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <UserIcon className="w-5 h-5 text-[#2d3661]" />
          <span>Meu Perfil</span>
        </h2>
        <p className="text-xs text-slate-500">
          Dados cadastrais e informações do aluno.
        </p>
      </div>

      {/* Card Principal com Avatar */}
      <Card className="p-6 text-center space-y-3 border-slate-100 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-[#2d3661] text-[#7de06f] flex items-center justify-center font-black text-xl mx-auto shadow-md border border-[#232b4e]">
          {user ? getInitials(user.nome) : "AL"}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{user?.nome || "Aluno"}</h3>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#4aaa3c]/10 text-[#2d3661] border border-[#4aaa3c]/30 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4aaa3c]" />
          <span>Perfil Ativo: {user?.perfil}</span>
        </div>
      </Card>

      {/* Detalhes Acadêmicos */}
      <Card className="p-4 space-y-3 border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Vínculo Escolar
        </h4>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center">
              <School className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Instituição
            </span>
            <span className="font-semibold text-slate-800 text-right">CEEP Cascavel</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Turma
            </span>
            <span className="font-semibold text-slate-800 text-right">{user?.turma_nome || "—"}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Curso
            </span>
            <span className="font-semibold text-slate-800 text-right">{user?.curso_nome || "Desenvolvimento de Sistemas"}</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500 flex items-center">
              <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
              E-mail Institucional
            </span>
            <span className="font-semibold text-slate-800">{user?.email}</span>
          </div>
        </div>
      </Card>

      {/* Botão Sair */}
      <Button
        variant="danger"
        size="md"
        onClick={() => setIsLogoutModalOpen(true)}
        className="w-full font-bold shadow-red-600/20"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sair da Conta
      </Button>

      {/* Modal de Confirmação de Logout */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Encerrar Sessão"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Deseja realmente sair da sua conta no <strong>CEEP+</strong>?
          </p>

          <div className="flex space-x-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={logout}
              className="flex-1 font-semibold"
            >
              Sim, Sair
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

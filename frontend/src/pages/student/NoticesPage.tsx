import React, { useState, useEffect } from "react";
import { noticeService } from "../../services/notice.service";
import type { Notice } from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Bell, Calendar, User as UserIcon, Tag } from "lucide-react";

type NoticeFilter = "TODOS" | "IMPORTANTES" | "GERAIS";

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filter, setFilter] = useState<NoticeFilter>("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotices = () => {
    setIsLoading(true);
    setError(null);
    noticeService
      .getNotices()
      .then(setNotices)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const getBadgeVariant = (prioridade: string) => {
    switch (prioridade) {
      case "URGENTE":
        return "danger";
      case "ALTA":
        return "warning";
      case "MEDIA":
        return "info";
      default:
        return "neutral";
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (filter === "IMPORTANTES") {
      return n.prioridade === "URGENTE" || n.prioridade === "ALTA";
    }
    if (filter === "GERAIS") {
      return n.publico_alvo_tipo === "GERAL";
    }
    return true;
  });

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadNotices} />;
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          <span>Mural de Avisos</span>
        </h2>
        <p className="text-xs text-slate-500">
          Comunicados oficiais publicados pela equipe escolar.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter("TODOS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "TODOS"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Todos ({notices.length})
        </button>
        <button
          onClick={() => setFilter("IMPORTANTES")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "IMPORTANTES"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Importantes
        </button>
        <button
          onClick={() => setFilter("GERAIS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "GERAIS"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Gerais
        </button>
      </div>

      {/* Lista de Avisos */}
      <div className="space-y-3">
        {filteredNotices.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhum aviso encontrado"
            description="Não há comunicados correspondentes ao filtro selecionado."
            actionLabel="Ver todos os avisos"
            onAction={() => setFilter("TODOS")}
          />
        ) : (
          filteredNotices.map((n) => (
            <Card key={n.id} className="p-4 space-y-2.5 border-slate-100 hover:border-slate-200 transition-all">
              <div className="flex items-center justify-between">
                <Badge variant={getBadgeVariant(n.prioridade)}>{n.prioridade}</Badge>
                <span className="text-[11px] text-slate-400 font-medium flex items-center">
                  <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                  {new Date(n.data_publicacao).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{n.titulo}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {n.descricao}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center">
                  <UserIcon className="w-3 h-3 mr-1 text-slate-400" />
                  {n.autor_nome || "Coordenação"}
                </span>
                <span className="inline-flex items-center text-slate-500 font-medium">
                  <Tag className="w-3 h-3 mr-1 text-slate-400" />
                  {n.publico_alvo_tipo}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

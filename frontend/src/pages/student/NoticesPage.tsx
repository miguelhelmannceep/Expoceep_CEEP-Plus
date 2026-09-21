import React, { useState, useEffect } from "react";
import { noticeService } from "../../services/notice.service";
import type { Notice } from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Bell, Calendar, User as UserIcon, Tag, ArrowRight } from "lucide-react";

type NoticeFilter = "TODOS" | "IMPORTANTES" | "GERAIS";

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filter, setFilter] = useState<NoticeFilter>("TODOS");
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
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

  const getPreviewText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return { text, isLong: false };
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return {
      text: (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "...",
      isLong: true
    };
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
          <Bell className="w-5 h-5 text-[#2d3661]" />
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
              ? "bg-[#2d3661] text-white shadow-sm shadow-[#2d3661]/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Todos ({notices.length})
        </button>
        <button
          onClick={() => setFilter("IMPORTANTES")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "IMPORTANTES"
              ? "bg-[#2d3661] text-white shadow-sm shadow-[#2d3661]/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Importantes
        </button>
        <button
          onClick={() => setFilter("GERAIS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "GERAIS"
              ? "bg-[#4aaa3c] text-white shadow-sm shadow-[#4aaa3c]/20"
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
          filteredNotices.map((n) => {
            const preview = getPreviewText(n.descricao, 150);
            return (
              <Card
                key={n.id}
                className="p-4 space-y-3 border-slate-100 hover:border-slate-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <Badge variant={getBadgeVariant(n.prioridade)}>{n.prioridade}</Badge>
                  <span className="text-[11px] text-slate-400 font-medium flex items-center">
                    <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                    {new Date(n.data_publicacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {/* Imagem do Comunicado (se existir) */}
                {n.imagem_url && (
                  <div
                    onClick={() => setSelectedNotice(n)}
                    className="rounded-xl overflow-hidden max-h-48 border border-slate-200 bg-slate-100 cursor-pointer"
                  >
                    <img
                      src={n.imagem_url}
                      alt={n.titulo}
                      className="w-full h-44 object-cover hover:scale-[1.01] transition-transform"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{n.titulo}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                    {preview.text}
                  </p>
                  {preview.isLong && (
                    <button
                      type="button"
                      onClick={() => setSelectedNotice(n)}
                      className="mt-2 text-xs font-bold text-[#2d3661] hover:text-[#4aaa3c] flex items-center transition-colors"
                    >
                      <span>Ler mais</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  )}
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
            );
          })
        )}
      </div>

      {/* MODAL DE LEITURA COMPLETA DO COMUNICADO */}
      <Modal
        isOpen={selectedNotice !== null}
        onClose={() => setSelectedNotice(null)}
        title="Comunicado Escolar"
      >
        {selectedNotice && (
          <div className="space-y-4">
            {/* Metadados e Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Badge variant={getBadgeVariant(selectedNotice.prioridade)}>
                  {selectedNotice.prioridade}
                </Badge>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {selectedNotice.publico_alvo_nome || selectedNotice.publico_alvo_tipo}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {new Date(selectedNotice.data_publicacao).toLocaleDateString("pt-BR")}
              </span>
            </div>

            {/* Imagem Completa (se existir) */}
            {selectedNotice.imagem_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm max-h-60">
                <img
                  src={selectedNotice.imagem_url}
                  alt={selectedNotice.titulo}
                  className="w-full h-56 object-cover"
                />
              </div>
            )}

            {/* Título e Texto Integral */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {selectedNotice.titulo}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedNotice.descricao}
              </p>
            </div>

            {/* Rodapé com autor e botão fechar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center">
                <UserIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Publicado por: <strong className="ml-1 text-slate-700">{selectedNotice.autor_nome || "Coordenação"}</strong>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNotice(null)}
                className="font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


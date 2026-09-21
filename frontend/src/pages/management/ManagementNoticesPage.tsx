import React, { useState, useEffect } from "react";
import { noticeService } from "../../services/notice.service";
import { scheduleService } from "../../services/schedule.service";
import type { Notice, CourseOption, ClassOption, CreateNoticePayload, UpdateNoticePayload } from "../../types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Send,
  Calendar,
  User as UserIcon,
  Tag,
  AlertCircle,
  CheckCircle2,
  Layers,
  Users,
  Image as ImageIcon,
  X,
  Upload
} from "lucide-react";


type NoticeFilter = "TODOS" | "PUBLICADOS" | "RASCUNHOS";

export const ManagementNoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [filter, setFilter] = useState<NoticeFilter>("TODOS");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"BAIXA" | "MEDIA" | "ALTA" | "URGENTE">("MEDIA");
  const [targetType, setTargetType] = useState<"GERAL" | "CURSO" | "TURMA">("GERAL");
  const [targetId, setTargetId] = useState<number | null>(null);
  const [status, setStatus] = useState<"PUBLICADO" | "RASCUNHO">("PUBLICADO");
  const [imageUrl, setImageUrl] = useState<string>("");

  // Estado para exclusão
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allNotices, allCourses, allClasses] = await Promise.all([
        noticeService.getAllNoticesManagement(),
        scheduleService.getCourses().catch(() => []),
        scheduleService.getClasses().catch(() => []),
      ]);
      setNotices(allNotices);
      setCourses(allCourses);
      setClasses(allClasses);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar comunicados da gestão.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingNoticeId(null);
    setTitle("");
    setDescription("");
    setPriority("MEDIA");
    setTargetType("GERAL");
    setTargetId(null);
    setStatus("PUBLICADO");
    setImageUrl("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setTitle(notice.titulo);
    setDescription(notice.descricao);
    setPriority(notice.prioridade);
    setTargetType(notice.publico_alvo_tipo);
    setTargetId(notice.publico_alvo_id || null);
    setStatus(notice.status || "PUBLICADO");
    setImageUrl(notice.imagem_url || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("O arquivo selecionado deve ser uma imagem (PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFormError("A imagem selecionada não pode exceder 4MB.");
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (!cleanTitle) {
      setFormError("O título do comunicado é obrigatório.");
      return;
    }
    if (!cleanDesc) {
      setFormError("O conteúdo do comunicado é obrigatório.");
      return;
    }

    if (targetType === "CURSO" && !targetId) {
      setFormError("Por favor, selecione o curso de destino para este comunicado.");
      return;
    }

    if (targetType === "TURMA" && !targetId) {
      setFormError("Por favor, selecione a turma de destino para este comunicado.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const finalImage = imageUrl.trim() || null;
      if (editingNoticeId) {
        const updatePayload: UpdateNoticePayload = {
          titulo: cleanTitle,
          descricao: cleanDesc,
          prioridade: priority,
          publico_alvo_tipo: targetType,
          publico_alvo_id: targetType === "GERAL" ? null : targetId,
          status: status,
          imagem_url: finalImage,
        };
        const updated = await noticeService.updateNotice(editingNoticeId, updatePayload);
        setNotices((prev) => prev.map((n) => (n.id === editingNoticeId ? updated : n)));
        showFeedback("Comunicado atualizado com sucesso!");
      } else {
        const createPayload: CreateNoticePayload = {
          titulo: cleanTitle,
          descricao: cleanDesc,
          prioridade: priority,
          publico_alvo_tipo: targetType,
          publico_alvo_id: targetType === "GERAL" ? null : targetId,
          status: status,
          imagem_url: finalImage,
        };
        const created = await noticeService.createNotice(createPayload);
        setNotices((prev) => [created, ...prev]);
        showFeedback(status === "PUBLICADO" ? "Comunicado publicado com sucesso!" : "Rascunho salvo com sucesso!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar comunicado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishDraft = async (noticeId: number) => {
    setPublishingId(noticeId);
    try {
      const published = await noticeService.publishNotice(noticeId);
      setNotices((prev) => prev.map((n) => (n.id === noticeId ? published : n)));
      showFeedback("Comunicado publicado no mural escolar!");
    } catch (err: any) {
      setError(err.message || "Erro ao publicar comunicado.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteNotice = async (noticeId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este comunicado permanentemente?")) {
      return;
    }

    setDeletingId(noticeId);
    try {
      await noticeService.deleteNotice(noticeId);
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      showFeedback("Comunicado excluído com sucesso.");
    } catch (err: any) {
      setError(err.message || "Erro ao excluir comunicado.");
    } finally {
      setDeletingId(null);
    }
  };

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case "URGENTE":
        return <Badge variant="danger">URGENTE</Badge>;
      case "ALTA":
        return <Badge variant="warning">ALTA</Badge>;
      case "MEDIA":
        return <Badge variant="info">MÉDIA</Badge>;
      default:
        return <Badge variant="neutral">BAIXA</Badge>;
    }
  };

  const publishedNotices = notices.filter((n) => n.status === "PUBLICADO");
  const draftNotices = notices.filter((n) => n.status === "RASCUNHO");

  const filteredNotices = notices.filter((n) => {
    if (filter === "PUBLICADOS") return n.status === "PUBLICADO";
    if (filter === "RASCUNHOS") return n.status === "RASCUNHO";
    return true;
  });

  if (isLoading) {
    return <ListSkeleton count={4} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Mensagem de Feedback de Sucesso */}
      {successMessage && (
        <div className="p-3.5 bg-[#4aaa3c]/10 border border-[#4aaa3c]/30 rounded-2xl text-xs text-[#2d3661] font-semibold flex items-center space-x-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#4aaa3c] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Cabeçalho de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#2d3661] bg-[#2d3661]/10 border border-[#2d3661]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Mural Institucional
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-[#2d3661]" />
            <span>Gerenciamento de Comunicados</span>
          </h2>
          <p className="text-xs text-slate-500">
            Publique avisos e comunicados com texto e imagem para toda a escola, cursos específicos ou turmas.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          className="font-bold bg-[#2d3661] hover:bg-[#232b4e] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#7de06f]" />
          <span>Novo comunicado</span>
        </Button>
      </div>

      {/* Filtros de Visualização */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter("TODOS")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "TODOS"
              ? "bg-[#2d3661] text-white shadow-sm shadow-[#2d3661]/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Todos ({notices.length})
        </button>
        <button
          onClick={() => setFilter("PUBLICADOS")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "PUBLICADOS"
              ? "bg-[#4aaa3c] text-white shadow-sm shadow-[#4aaa3c]/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Publicados ({publishedNotices.length})
        </button>
        <button
          onClick={() => setFilter("RASCUNHOS")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "RASCUNHOS"
              ? "bg-[#2d3661] text-white shadow-sm shadow-[#2d3661]/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Rascunhos ({draftNotices.length})
        </button>
      </div>

      {/* Listagem dos Comunicados */}
      <div className="space-y-3">
        {filteredNotices.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === "RASCUNHOS" ? "Nenhum rascunho" : "Nenhum comunicado encontrado"}
            description={
              filter === "RASCUNHOS"
                ? "Você não possui comunicados em rascunho no momento."
                : "Nenhum aviso corresponde ao filtro selecionado."
            }
            actionLabel={filter !== "TODOS" ? "Ver todos os comunicados" : undefined}
            onAction={() => setFilter("TODOS")}
          />
        ) : (
          filteredNotices.map((n) => {
            const isDraft = n.status === "RASCUNHO";
            return (
              <Card
                key={n.id}
                className={`p-5 space-y-3.5 border transition-all ${
                  isDraft
                    ? "bg-slate-50/70 border-slate-200"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Linha 1: Badges de Status, Prioridade e Público */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isDraft ? (
                      <Badge variant="warning" size="sm">
                        RASCUNHO
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        PUBLICADO
                      </Badge>
                    )}
                    {getPriorityBadge(n.prioridade)}
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center">
                      <Tag className="w-3 h-3 mr-1 text-slate-400" />
                      {n.publico_alvo_nome || n.publico_alvo_tipo}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {new Date(n.data_publicacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {/* Imagem do Comunicado (se existir) */}
                {n.imagem_url && (
                  <div className="rounded-xl overflow-hidden max-h-48 border border-slate-200 bg-slate-100">
                    <img
                      src={n.imagem_url}
                      alt={n.titulo}
                      className="w-full h-48 object-cover hover:scale-[1.01] transition-transform"
                    />
                  </div>
                )}

                {/* Linha 2: Título e Conteúdo */}
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{n.titulo}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {n.descricao}
                  </p>
                </div>

                {/* Linha 3: Rodapé com Autor e Ações */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 flex items-center">
                    <UserIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    Autor: <strong className="ml-1 text-slate-700">{n.autor_nome || "Gestão"}</strong>
                  </span>

                  <div className="flex items-center space-x-2">
                    {isDraft && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePublishDraft(n.id)}
                        isLoading={publishingId === n.id}
                        disabled={publishingId === n.id}
                        className="font-bold bg-[#4aaa3c] hover:bg-[#3d9131] text-white text-xs"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        <span>Publicar</span>
                      </Button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(n)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#2d3661] hover:text-[#222a4d] bg-slate-100 hover:bg-[#2d3661]/10 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1"
                      title="Editar comunicado"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteNotice(n.id)}
                      disabled={deletingId === n.id}
                      className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center space-x-1 disabled:opacity-50"
                      title="Excluir comunicado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE COMUNICADO ESCOLAR */}
      {/* ========================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingNoticeId ? "Editar Comunicado" : "Novo Comunicado Escolar"}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Campo Título */}
          <div className="space-y-1.5">
            <label htmlFor="notice-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Título do Comunicado <span className="text-red-500">*</span>
            </label>
            <input
              id="notice-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Calendário das Bancas Finais de TCC"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/10"
            />
          </div>

          {/* Campo Imagem (Opcional) */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-[#2d3661]" />
                <span>Imagem Ilustrativa (Opcional)</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center space-x-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>Remover imagem</span>
                </button>
              )}
            </div>

            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white">
                <img
                  src={imageUrl}
                  alt="Prévia do comunicado"
                  className="w-full h-36 object-cover"
                />
                <div className="p-2 bg-white/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-medium truncate max-w-[200px]">Imagem associada</span>
                  <label className="text-xs font-bold text-[#2d3661] hover:underline cursor-pointer">
                    Substituir
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-[#2d3661]" />
                    <span>Carregar arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">ou informe uma URL abaixo</span>
                </div>

                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/10"
                />
              </div>
            )}
          </div>

          {/* Campo Descrição */}
          <div className="space-y-1.5">
            <label htmlFor="notice-desc" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Conteúdo / Mensagem <span className="text-red-500">*</span>
            </label>
            <textarea
              id="notice-desc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite o comunicado completo que será apresentado aos alunos..."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2d3661] focus:ring-2 focus:ring-[#2d3661]/10 resize-none leading-relaxed"
            />
          </div>

          {/* Linha: Prioridade e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="notice-priority" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Prioridade
              </label>
              <select
                id="notice-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#2d3661]"
              >
                <option value="BAIXA">Baixa (Informativo geral)</option>
                <option value="MEDIA">Média (Padrão)</option>
                <option value="ALTA">Alta (Importante)</option>
                <option value="URGENTE">Urgente (Atenção imediata)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notice-status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Estado de Publicação
              </label>
              <select
                id="notice-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#2d3661]"
              >
                <option value="PUBLICADO">Publicar Imediatamente</option>
                <option value="RASCUNHO">Salvar como Rascunho</option>
              </select>
            </div>
          </div>

          {/* Segmentação de Público-Alvo */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Público-Alvo (Segmentação)
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType("GERAL");
                  setTargetId(null);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  targetType === "GERAL"
                    ? "bg-[#2d3661] text-white border-[#2d3661] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Toda Escola
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType("CURSO");
                  if (courses.length > 0 && !targetId) {
                    setTargetId(courses[0].id);
                  }
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  targetType === "CURSO"
                    ? "bg-[#2d3661] text-white border-[#2d3661] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Por Curso
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType("TURMA");
                  if (classes.length > 0 && !targetId) {
                    setTargetId(classes[0].id);
                  }
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                  targetType === "TURMA"
                    ? "bg-[#2d3661] text-white border-[#2d3661] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Por Turma
              </button>
            </div>

            {/* Dropdown dinâmico dependendo da segmentação selecionada */}
            {targetType === "CURSO" && (
              <div className="space-y-1 pt-1">
                <label htmlFor="course-select" className="block text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-[#2d3661]" />
                  <span>Selecione o Curso de Destino</span>
                </label>
                <select
                  id="course-select"
                  value={targetId || ""}
                  onChange={(e) => setTargetId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#2d3661]"
                >
                  <option value="" disabled>Selecione um curso...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.sigla})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "TURMA" && (
              <div className="space-y-1 pt-1">
                <label htmlFor="class-select" className="block text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-[#2d3661]" />
                  <span>Selecione a Turma de Destino</span>
                </label>
                <select
                  id="class-select"
                  value={targetId || ""}
                  onChange={(e) => setTargetId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#2d3661]"
                >
                  <option value="" disabled>Selecione uma turma...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nome_turma} — {cls.periodo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botões do Formulário */}
          <div className="flex space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="w-1/3"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="w-2/3 font-bold bg-[#2d3661] hover:bg-[#232b4e] text-white"
            >
              {editingNoticeId ? "Salvar Alterações" : status === "PUBLICADO" ? "Publicar Comunicado" : "Salvar Rascunho"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

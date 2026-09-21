import React, { useState, useEffect } from "react";
import { taskService } from "../../services/task.service";
import type { Task } from "../../types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Badge } from "../../components/common/Badge";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  CheckSquare,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  AlertCircle,
  Trash2,
  Check,
  CalendarOff
} from "lucide-react";

type TaskFilter = "TODAS" | "PENDENTES" | "CONCLUIDAS";

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("PENDENTES");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do Modal de Criação de Tarefa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [noDueDate, setNoDueDate] = useState(false);
  const [newPriority, setNewPriority] = useState<"BAIXA" | "MEDIA" | "ALTA">("MEDIA");

  // Estados do Modal de Exclusão de Tarefa
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadTasks = () => {
    setIsLoading(true);
    setError(null);
    taskService
      .getMyTasks()
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleTask = async (taskId: number) => {
    setTogglingId(taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA" }
          : t
      )
    );

    try {
      const updated = await taskService.toggleTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: any) {
      loadTasks();
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenCreateModal = () => {
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNoDueDate(false);
    setNewPriority("MEDIA");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) {
      setFormError("O título da atividade é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await taskService.createTask({
        titulo: cleanTitle,
        descricao: newDescription.trim() || undefined,
        data_entrega: noDueDate ? undefined : (newDueDate || undefined),
        prioridade: newPriority,
      });

      // Adiciona a nova tarefa na lista
      setTasks((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setSuccessMessage("Tarefa criada com sucesso.");
      setTimeout(() => setSuccessMessage(null), 3000);
      // Garante que o filtro mostre a tarefa criada
      if (filter === "CONCLUIDAS") {
        setFilter("PENDENTES");
      }
    } catch (err: any) {
      setFormError(err.message || "Erro ao criar nova tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await taskService.deleteTask(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
      setSuccessMessage("Tarefa excluída com sucesso.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setDeleteError(err.message || "Não foi possível excluir a tarefa. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case "ALTA":
        return <Badge variant="warning">Alta</Badge>;
      case "MEDIA":
        return <Badge variant="info">Média</Badge>;
      default:
        return <Badge variant="neutral">Baixa</Badge>;
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "CONCLUIDA");
  const completedTasks = tasks.filter((t) => t.status === "CONCLUIDA");

  const filteredTasks = tasks.filter((t) => {
    if (filter === "PENDENTES") return t.status !== "CONCLUIDA";
    if (filter === "CONCLUIDAS") return t.status === "CONCLUIDA";
    return true;
  });

  if (isLoading) {
    return <ListSkeleton count={3} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadTasks} />;
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com Ação de Nova Tarefa */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-[#2d3661] dark:text-[#7de06f]" />
            <span>Minhas Tarefas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe prazos e marque atividades concluídas.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreateModal}
          className="font-bold bg-[#2d3661] hover:bg-[#222a4d] text-white shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-1 text-[#7de06f]" />
          <span>Nova tarefa</span>
        </Button>
      </div>

      {/* Alerta de Sucesso */}
      {successMessage && (
        <div className="p-3 bg-[#4aaa3c]/10 dark:bg-[#4aaa3c]/20 border border-[#4aaa3c]/30 rounded-xl text-xs text-[#2d3661] dark:text-[#7de06f] flex items-center space-x-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-[#4aaa3c] shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter("PENDENTES")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "PENDENTES"
              ? "bg-[#2d3661] text-white shadow-sm shadow-[#2d3661]/20"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          Pendentes ({pendingTasks.length})
        </button>
        <button
          onClick={() => setFilter("CONCLUIDAS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "CONCLUIDAS"
              ? "bg-slate-900 dark:bg-[#4aaa3c] text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          Concluídas ({completedTasks.length})
        </button>
        <button
          onClick={() => setFilter("TODAS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "TODAS"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          Todas ({tasks.length})
        </button>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={filter === "PENDENTES" ? "Tudo em dia!" : "Nenhuma tarefa encontrada"}
            description={
              filter === "PENDENTES"
                ? "Você não possui nenhuma tarefa pendente no momento."
                : "Não há tarefas para o filtro selecionado."
            }
            actionLabel={filter !== "TODAS" ? "Ver todas as tarefas" : undefined}
            onAction={() => setFilter("TODAS")}
          />
        ) : (
          filteredTasks.map((t) => {
            const isCompleted = t.status === "CONCLUIDA";
            return (
              <Card
                key={t.id}
                className={`p-3.5 space-y-2.5 border transition-all ${
                  isCompleted
                    ? "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-80"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(t.id)}
                      disabled={togglingId === t.id}
                      aria-label={isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                      className="mt-0.5 text-slate-400 hover:text-[#4aaa3c] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#4aaa3c] rounded-full"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[#4aaa3c] fill-[#4aaa3c]/10" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-[#4aaa3c]" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm font-bold tracking-tight leading-snug transition-all ${
                          isCompleted
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {t.titulo}
                      </h3>
                      {t.descricao && (
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isCompleted ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {t.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <div>{getPriorityBadge(t.prioridade)}</div>
                    
                    {/* Botão de Excluir Tarefa */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setTaskToDelete(t);
                      }}
                      title="Excluir tarefa"
                      aria-label="Excluir tarefa"
                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Rodapé da Tarefa */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center">
                    {t.data_entrega ? (
                      <>
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        Entrega: {new Date(t.data_entrega + "T00:00:00").toLocaleDateString("pt-BR")}
                      </>
                    ) : (
                      <>
                        <CalendarOff className="w-3 h-3 mr-1 text-slate-400" />
                        <span className="italic text-slate-400 dark:text-slate-500">Sem prazo</span>
                      </>
                    )}
                  </span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    {isCompleted ? "Concluída" : "Pendente"}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* MODAL DE CRIAÇÃO DE NOVA TAREFA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Nova Tarefa"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Campo Título */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Trabalho de Banco de Dados"
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/10"
            />
          </div>

          {/* Campo Descrição */}
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Descrição (opcional)
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Detalhes ou anotações sobre a entrega..."
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/10 resize-none"
            />
          </div>

          {/* Grid: Data de Entrega e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="task-date" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Data de Entrega
                </label>
              </div>

              <input
                id="task-date"
                type="date"
                disabled={noDueDate}
                value={noDueDate ? "" : newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className={`w-full px-3.5 py-2 text-xs rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#2d3661]/10 ${
                  noDueDate
                    ? "bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-[#2d3661] dark:focus:border-[#4aaa3c]"
                }`}
              />

              {/* Checkbox Sem Prazo de Entrega */}
              <label className="flex items-center space-x-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noDueDate}
                  onChange={(e) => {
                    setNoDueDate(e.target.checked);
                    if (e.target.checked) {
                      setNewDueDate("");
                    }
                  }}
                  className="rounded border-slate-300 dark:border-slate-600 text-[#4aaa3c] focus:ring-[#4aaa3c] w-3.5 h-3.5"
                />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Sem prazo de entrega
                </span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-priority" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Prioridade
              </label>
              <select
                id="task-priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as "BAIXA" | "MEDIA" | "ALTA")}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-[#2d3661] dark:focus:border-[#4aaa3c] focus:ring-2 focus:ring-[#2d3661]/10"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
          </div>

          {/* Botões do Formulário */}
          <div className="flex space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
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
              disabled={isSubmitting || !newTitle.trim()}
              className="w-2/3 font-bold bg-[#2d3661] hover:bg-[#222a4d] text-white"
            >
              Criar tarefa
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        isOpen={taskToDelete !== null}
        onClose={() => !isDeleting && setTaskToDelete(null)}
        title="Excluir Tarefa"
      >
        <div className="space-y-4 text-center">
          {deleteError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-start space-x-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Confirmar exclusão desta atividade?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
              A tarefa <strong>&ldquo;{taskToDelete?.titulo}&rdquo;</strong> será removida permanentemente.
            </p>
          </div>

          <div className="flex space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setTaskToDelete(null)}
              disabled={isDeleting}
              className="w-1/2 font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDeleteTask}
              isLoading={isDeleting}
              disabled={isDeleting}
              className="w-1/2 font-bold"
            >
              Sim, excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


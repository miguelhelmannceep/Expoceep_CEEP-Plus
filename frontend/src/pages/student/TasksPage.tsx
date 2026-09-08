import React, { useState, useEffect } from "react";
import { taskService } from "../../services/task.service";
import type { Task } from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ListSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { CheckSquare, Calendar, CheckCircle2, Circle, Clock } from "lucide-react";

type TaskFilter = "TODAS" | "PENDENTES" | "CONCLUIDAS";

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("PENDENTES");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
    // Atualização otimista no estado local
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
      // Reverte em caso de erro
      loadTasks();
    } finally {
      setTogglingId(null);
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
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <CheckSquare className="w-5 h-5 text-emerald-600" />
          <span>Minhas Tarefas</span>
        </h2>
        <p className="text-xs text-slate-500">
          Acompanhe prazos e marque atividades concluídas.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter("PENDENTES")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "PENDENTES"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-700/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Pendentes ({pendingTasks.length})
        </button>
        <button
          onClick={() => setFilter("CONCLUIDAS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "CONCLUIDAS"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Concluídas ({completedTasks.length})
        </button>
        <button
          onClick={() => setFilter("TODAS")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === "TODAS"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
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
                    ? "bg-slate-50/60 border-slate-200/80 opacity-80"
                    : "bg-white border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(t.id)}
                      disabled={togglingId === t.id}
                      aria-label={isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm font-bold tracking-tight leading-snug transition-all ${
                          isCompleted
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {t.titulo}
                      </h3>
                      {t.descricao && (
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isCompleted ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {t.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">{getPriorityBadge(t.prioridade)}</div>
                </div>

                {/* Rodapé da Tarefa */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                    Entrega:{" "}
                    {t.data_entrega
                      ? new Date(t.data_entrega).toLocaleDateString("pt-BR")
                      : "Sem data definida"}
                  </span>
                  <span className="font-semibold text-slate-600 flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    {isCompleted ? "Concluída" : "Pendente"}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

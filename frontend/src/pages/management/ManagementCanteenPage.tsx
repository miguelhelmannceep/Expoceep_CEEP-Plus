import React, { useState, useEffect } from "react";
import {
  Coffee,
  ShoppingBag,
  Tag,
  Plus,
  Edit2,
  Power,
  X,
  CheckCircle2,
  Clock,
  PackageCheck,
  DollarSign,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { managementCanteenService } from "../../services/management_canteen.service";
import type {
  ManagementOrderDetail,
  ManagementProductItem,
  CreateProductPayload,
  UpdateProductPayload,
} from "../../types";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";

export const ManagementCanteenPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"pedidos" | "produtos">("pedidos");

  // Dados
  const [orders, setOrders] = useState<ManagementOrderDetail[]>([]);
  const [products, setProducts] = useState<ManagementProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtros de Pedidos
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("TODOS");
  const [orderSearch, setOrderSearch] = useState("");

  // Modal de Detalhes do Pedido
  const [selectedOrder, setSelectedOrder] = useState<ManagementOrderDetail | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);

  // Modal de Produto (Criar / Editar)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ManagementProductItem | null>(null);
  const [productFormData, setProductFormData] = useState<{
    nome: string;
    descricao: string;
    preco: string;
    ativo: boolean;
  }>({
    nome: "",
    descricao: "",
    preco: "",
    ativo: true,
  });
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Carregar dados
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ordersData, productsData] = await Promise.all([
        managementCanteenService.getOrders(),
        managementCanteenService.getProducts(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados da cantina";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  // Métricas consolidadas dos pedidos
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === "PENDENTE_PAGAMENTO").length;
  const paidOrdersCount = orders.filter((o) => o.status === "PAGO").length;
  const usedOrdersCount = orders.filter((o) => o.status === "UTILIZADO").length;
  const confirmedRevenue = orders
    .filter((o) => o.status === "PAGO" || o.status === "UTILIZADO")
    .reduce((acc, curr) => acc + curr.valor_total, 0);

  // Filtro de pedidos
  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      orderStatusFilter === "TODOS" || o.status === orderStatusFilter;
    const matchesSearch =
      orderSearch.trim() === "" ||
      o.id.toString().includes(orderSearch) ||
      o.aluno_nome.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.aluno_email.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.itens.some((it) => it.produto_nome.toLowerCase().includes(orderSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Funções de Pedidos
  const handleOpenOrderDetail = (order: ManagementOrderDetail) => {
    setSelectedOrder(order);
    setIsOrderDetailModalOpen(true);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDENTE_PAGAMENTO":
        return <Badge variant="warning">Aguardando PIX</Badge>;
      case "PAGO":
        return <Badge variant="success">Pago / Pronto</Badge>;
      case "UTILIZADO":
        return <Badge variant="neutral">Retirado</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Funções de Produtos
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      nome: "",
      descricao: "",
      preco: "",
      ativo: true,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ManagementProductItem) => {
    setEditingProduct(prod);
    setProductFormData({
      nome: prod.nome,
      descricao: prod.descricao || "",
      preco: prod.preco.toString(),
      ativo: prod.ativo,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeClean = productFormData.nome.trim();
    if (!nomeClean) {
      showFeedback("error", "O nome do produto é obrigatório.");
      return;
    }

    const precoNum = parseFloat(productFormData.preco.replace(",", "."));
    if (isNaN(precoNum) || precoNum <= 0) {
      showFeedback("error", "O preço do produto deve ser maior que zero (ex: 8.50).");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      if (editingProduct) {
        const payload: UpdateProductPayload = {
          nome: nomeClean,
          descricao: productFormData.descricao.trim() || null,
          preco: precoNum,
          ativo: productFormData.ativo,
        };
        const updated = await managementCanteenService.updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showFeedback("success", `Produto "${updated.nome}" atualizado com sucesso!`);
      } else {
        const payload: CreateProductPayload = {
          nome: nomeClean,
          descricao: productFormData.descricao.trim() || null,
          preco: precoNum,
          ativo: productFormData.ativo,
        };
        const created = await managementCanteenService.createProduct(payload);
        setProducts((prev) => [...prev, created]);
        showFeedback("success", `Produto "${created.nome}" cadastrado com sucesso!`);
      }
      setIsProductModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar produto";
      showFeedback("error", message);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleToggleProductActive = async (prod: ManagementProductItem) => {
    try {
      const updated = await managementCanteenService.toggleProductActive(prod.id);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showFeedback(
        "success",
        `Produto "${updated.nome}" agora está ${updated.ativo ? "ATIVO" : "INATIVO"}.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao alterar status do produto";
      showFeedback("error", message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Carregando dados da cantina escolar..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border shadow-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho do Módulo de Cantina */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Gestão Escolar
            </span>
            <span className="text-xs text-slate-400 font-medium">| Cantina & Demanda</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Gestão da Cantina</h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de pedidos, controle de produtos e faturamento do balcão.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-all self-start sm:self-auto border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Sub-abas: PEDIDOS vs PRODUTOS */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveSubTab("pedidos")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "pedidos"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Pedidos Realizados ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("produtos")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "produtos"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Cardápio & Produtos ({products.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: PEDIDOS DA CANTINA */}
      {/* ========================================================================= */}
      {activeSubTab === "pedidos" && (
        <div className="space-y-5">
          {/* Indicadores Compactos */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Total */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                <span>Total Pedidos</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalOrdersCount}</p>
              <p className="text-[10px] text-slate-400">Fichas geradas</p>
            </Card>

            {/* Pendentes */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Aguardando PIX</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{pendingOrdersCount}</p>
              <p className="text-[10px] text-slate-400">Pagamento pendente</p>
            </Card>

            {/* Pagos / Prontos */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pagos / Balcão</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{paidOrdersCount}</p>
              <p className="text-[10px] text-slate-400">Prontos para retirada</p>
            </Card>

            {/* Retirados */}
            <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium">
                <PackageCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Retirados</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{usedOrdersCount}</p>
              <p className="text-[10px] text-slate-400">Entregues com QR</p>
            </Card>

            {/* Faturamento Confirmado */}
            <Card className="p-4 bg-slate-900 text-white border-slate-800 shadow-sm space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Receita Confirmada</span>
              </div>
              <p className="text-xl font-black text-emerald-400">
                {formatCurrency(confirmedRevenue)}
              </p>
              <p className="text-[10px] text-slate-400">Faturamento consolidado</p>
            </Card>
          </div>

          {/* Barra de Filtros de Pedidos */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            {/* Status Filter Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setOrderStatusFilter("TODOS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  orderStatusFilter === "TODOS"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todos ({orders.length})
              </button>

              <button
                onClick={() => setOrderStatusFilter("PENDENTE_PAGAMENTO")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  orderStatusFilter === "PENDENTE_PAGAMENTO"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
                }`}
              >
                Pendentes ({pendingOrdersCount})
              </button>

              <button
                onClick={() => setOrderStatusFilter("PAGO")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  orderStatusFilter === "PAGO"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                Pagos ({paidOrdersCount})
              </button>

              <button
                onClick={() => setOrderStatusFilter("UTILIZADO")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  orderStatusFilter === "UTILIZADO"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Retirados ({usedOrdersCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar aluno, produto, pedido..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Lista de Pedidos */}
          {filteredOrders.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 bg-white border-slate-200">
              Nenhum pedido encontrado para os filtros selecionados.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-black text-xs flex-shrink-0">
                      #{order.id.toString().padStart(4, "0")}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{order.aluno_nome}</span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({order.aluno_email})
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {order.itens.map((it) => `${it.quantidade}x ${it.produto_nome}`).join(", ")}
                      </p>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                          {new Date(order.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {order.paid_at && (
                          <span className="text-emerald-600 font-medium">
                            • Pago em {new Date(order.paid_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {order.used_at && (
                          <span className="text-slate-500 font-medium">
                            • Retirado em {new Date(order.used_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(order.valor_total)}
                      </p>
                      <div className="mt-0.5">{getOrderStatusBadge(order.status)}</div>
                    </div>

                    <button
                      onClick={() => handleOpenOrderDetail(order)}
                      className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: PRODUTOS DO CARDÁPIO */}
      {/* ========================================================================= */}
      {activeSubTab === "produtos" && (
        <div className="space-y-5">
          {/* Ações do Cardápio */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Catálogo de Produtos da Cantina</h3>
              <p className="text-xs text-slate-500">
                Produtos disponíveis para compra no aplicativo do estudante.
              </p>
            </div>

            <button
              onClick={handleOpenCreateProduct}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>

          {/* Grid de Produtos */}
          {products.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 bg-white border-slate-200">
              Nenhum produto cadastrado na cantina.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => (
                <Card
                  key={prod.id}
                  className={`p-4 space-y-3 bg-white border transition-all ${
                    prod.ativo ? "border-slate-200 shadow-sm" : "border-slate-200 bg-slate-50/70 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center font-bold text-sm">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{prod.nome}</h4>
                        <span className="text-xs font-extrabold text-emerald-600">
                          {formatCurrency(prod.preco)}
                        </span>
                      </div>
                    </div>

                    <Badge variant={prod.ativo ? "success" : "neutral"}>
                      {prod.ativo ? "ATIVO" : "INATIVO"}
                    </Badge>
                  </div>

                  {prod.descricao && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {prod.descricao}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleProductActive(prod)}
                      className={`inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                        prod.ativo
                          ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{prod.ativo ? "Desativar" : "Ativar"}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditProduct(prod)}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DO PEDIDO */}
      {/* ========================================================================= */}
      {isOrderDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  #{selectedOrder.id.toString().padStart(4, "0")}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ficha de Pedido</h3>
                  <p className="text-xs text-slate-400">Identificador da Cantina</p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações do Aluno */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Dados do Estudante</span>
              </div>
              <p className="text-xs font-semibold text-slate-900">{selectedOrder.aluno_nome}</p>
              <p className="text-xs text-slate-500">{selectedOrder.aluno_email}</p>
            </div>

            {/* Itens do Pedido */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itens Comprados
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {selectedOrder.itens.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{it.produto_nome}</span>
                      <p className="text-[11px] text-slate-400">
                        {it.quantidade}x {formatCurrency(it.preco_unitario)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800">
                      {formatCurrency(it.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo Financeiro e Datas */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Status Atual:</span>
                <div>{getOrderStatusBadge(selectedOrder.status)}</div>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Valor Total:</span>
                <span className="text-sm text-emerald-600 font-black">
                  {formatCurrency(selectedOrder.valor_total)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-500">
                <p>• Criado em: {new Date(selectedOrder.created_at).toLocaleString("pt-BR")}</p>
                {selectedOrder.paid_at && (
                  <p className="text-emerald-700 font-medium">
                    • Pago via PIX Simulado em: {new Date(selectedOrder.paid_at).toLocaleString("pt-BR")}
                  </p>
                )}
                {selectedOrder.used_at && (
                  <p className="text-blue-700 font-medium">
                    • Retirado no balcão em: {new Date(selectedOrder.used_at).toLocaleString("pt-BR")}
                  </p>
                )}
                {selectedOrder.pickup_token && (
                  <p className="text-slate-400 font-mono text-[10px]">
                    • Token de Retirada: {selectedOrder.pickup_token}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsOrderDetailModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR PRODUTO */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </h3>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Nome */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salgado Assado de Frango"
                  value={productFormData.nome}
                  onChange={(e) => setProductFormData({ ...productFormData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preço */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Preço em Reais (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="8.00"
                  value={productFormData.preco}
                  onChange={(e) => setProductFormData({ ...productFormData, preco: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Descrição (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Salgado assado na hora, massa folhada."
                  value={productFormData.descricao}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, descricao: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ativoCheckbox"
                  checked={productFormData.ativo}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, ativo: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="ativoCheckbox" className="font-medium text-slate-700 cursor-pointer">
                  Produto ativo e disponível no cardápio
                </label>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmittingProduct ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Criar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { canteenService } from "../../services/canteen.service";
import type { Product, Order, PickupQRResponse } from "../../types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Badge } from "../../components/common/Badge";
import { ListSkeleton } from "../../components/common/Skeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  Coffee,
  Check,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  Copy,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
} from "lucide-react";

type CheckoutStep = "IDLE" | "SUMMARY" | "PAYMENT" | "SUCCESS" | "PICKUP_QR";

export const CanteenPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado do Carrinho de Compras (produto_id -> quantidade)
  const [cart, setCart] = useState<Record<number, number>>({});

  // Estado do fluxo transacional
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [pickupQRData, setPickupQRData] = useState<PickupQRResponse | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const [prods, myOrders] = await Promise.all([
        canteenService.getProducts(),
        canteenService.getOrders(),
      ]);
      // Exibe todos os produtos ativos do catálogo oficial
      setProducts(prods.filter((p) => p.ativo));
      setOrders(myOrders);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar informações da cantina.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helpers do Carrinho
  const getItemQuantity = (productId: number): number => cart[productId] || 0;

  const handleAddToCart = (productId: number) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleDecreaseQuantity = (productId: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: current - 1,
      };
    });
  };

  const handleRemoveItem = (productId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const cartItems = Object.entries(cart)
    .map(([idStr, qty]) => {
      const prod = products.find((p) => p.id === Number(idStr));
      return prod && qty > 0
        ? {
            product: prod,
            quantity: qty,
            subtotal: prod.preco * qty,
          }
        : null;
    })
    .filter(Boolean) as {
    product: Product;
    quantity: number;
    subtotal: number;
  }[];

  const totalItemsCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, it) => acc + it.subtotal, 0);

  // Iniciar Checkout do Carrinho
  const handleOpenCart = () => {
    if (totalItemsCount === 0) return;
    setCheckoutError(null);
    setCheckoutStep("SUMMARY");
  };

  // Criar Pedido Unificado com todos os itens do carrinho
  const handleProceedToPayment = async () => {
    if (cartItems.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const payloadItens = cartItems.map((it) => ({
        produto_id: it.product.id,
        quantidade: it.quantity,
      }));

      const order = await canteenService.createOrder({
        itens: payloadItens,
      });

      setCurrentOrder(order);
      setCart({}); // Limpa o carrinho após a criação bem-sucedida do pedido
      setCheckoutStep("PAYMENT");
      canteenService.getOrders().then(setOrders).catch(() => {});
    } catch (err: any) {
      setCheckoutError(err.message || "Não foi possível gerar o pedido. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Simular Pagamento PIX
  const handleSimulatePayment = async () => {
    if (!currentOrder || isProcessing) return;

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const updatedOrder = await canteenService.simulatePayment(currentOrder.id);
      setCurrentOrder(updatedOrder);
      setCheckoutStep("SUCCESS");
      const updatedOrders = await canteenService.getOrders();
      setOrders(updatedOrders);
    } catch (err: any) {
      setCheckoutError(err.message || "Erro ao processar a simulação do pagamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Abrir QR Code de Retirada
  const handleOpenPickupQR = async (orderId: number) => {
    setIsProcessing(true);
    setCheckoutError(null);
    try {
      const qrInfo = await canteenService.getPickupQR(orderId);
      setPickupQRData(qrInfo);
      setCheckoutStep("PICKUP_QR");
    } catch (err: any) {
      setCheckoutError(err.message || "Erro ao obter QR Code de retirada.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    if (isProcessing) return;
    setCheckoutStep("IDLE");
    setCurrentOrder(null);
    setPickupQRData(null);
    setCheckoutError(null);
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;
  const formatOrderId = (id: number) => `#${id.toString().padStart(5, "0")}`;

  if (isLoading) {
    return <ListSkeleton count={2} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className={`space-y-6 ${totalItemsCount > 0 ? "pb-20" : ""}`}>
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Coffee className="w-5 h-5 text-[#2d3661] dark:text-[#7de06f]" />
          <span>Cantina Escolar</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Adquira suas fichas antecipadas e retire no balcão sem enfrentar filas.
        </p>
      </div>

      {/* Explicação Unificada no Topo */}
      <div className="bg-gradient-to-r from-[#2d3661]/10 via-[#4aaa3c]/10 to-[#2d3661]/5 dark:from-[#2d3661]/30 dark:via-[#4aaa3c]/20 dark:to-[#2d3661]/10 border border-[#2d3661]/20 dark:border-slate-700 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
        <div className="p-2.5 bg-[#2d3661] dark:bg-[#7de06f] text-white dark:text-slate-900 rounded-xl shrink-0 mt-0.5 shadow-sm">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Carrinho Unificado • QR Code Único
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Selecione vários produtos, defina as quantidades e finalize tudo em uma única compra. Com um só pagamento PIX demonstrativo, você gera um <strong>QR Code único</strong> para retirar todos os seus itens juntos no balcão da cantina.
          </p>
        </div>
      </div>

      {/* Catálogo de Produtos Simplificado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cardápio Disponível ({products.length})
          </h3>
          {totalItemsCount > 0 && (
            <span className="text-[11px] font-bold text-[#4aaa3c] dark:text-[#7de06f]">
              {totalItemsCount} {totalItemsCount === 1 ? "item no carrinho" : "itens no carrinho"}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {products.map((p) => {
            const qtyInCart = getItemQuantity(p.id);

            return (
              <Card
                key={p.id}
                className="p-3.5 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {p.nome}
                    </h4>
                    <span className="text-base font-extrabold text-[#4aaa3c] dark:text-[#7de06f] block">
                      {formatCurrency(p.preco)}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {qtyInCart === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToCart(p.id)}
                        className="font-bold border-slate-300 dark:border-slate-700 text-[#2d3661] dark:text-[#7de06f] hover:bg-[#2d3661] hover:text-white dark:hover:bg-[#7de06f] dark:hover:text-slate-900 transition-all rounded-xl px-3 py-1.5 text-xs shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Adicionar
                      </Button>
                    ) : (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 space-x-1.5 shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQuantity(p.id)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95"
                          title="Diminuir quantidade"
                          aria-label={`Diminuir quantidade de ${p.nome}`}
                        >
                          {qtyInCart === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="w-6 text-center text-xs font-black text-slate-900 dark:text-slate-100">
                          {qtyInCart}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(p.id)}
                          className="w-7 h-7 rounded-lg bg-[#2d3661] dark:bg-[#7de06f] text-white dark:text-slate-900 hover:bg-[#232b4e] dark:hover:bg-[#68c65c] flex items-center justify-center shadow-sm transition-all active:scale-95"
                          title="Aumentar quantidade"
                          aria-label={`Aumentar quantidade de ${p.nome}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Histórico de Pedidos do Aluno */}
      {orders.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>Seus Pedidos ({orders.length})</span>
          </h3>

          <div className="space-y-2.5">
            {orders.map((order) => {
              const isPaid = order.status === "PAGO";
              const isUsed = order.status === "UTILIZADO";
              const isPending = order.status === "PENDENTE_PAGAMENTO";

              const itemsSummary =
                order.itens && order.itens.length > 0
                  ? order.itens.map((it) => `${it.quantidade}x ${it.produto_nome || "Item"}`).join(" • ")
                  : "Pedido Cantina";

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        Pedido {formatOrderId(order.id)}
                      </span>
                      {isPaid && (
                        <Badge variant="success" size="sm">
                          DISPONÍVEL
                        </Badge>
                      )}
                      {isUsed && (
                        <Badge variant="neutral" size="sm">
                          RETIRADO
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="warning" size="sm">
                          PENDENTE
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(order.valor_total)}
                    </span>
                  </div>

                  {/* Lista de itens do pedido no histórico */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {itemsSummary}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-1">
                      {isUsed ? (
                        <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                      ) : isPaid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4aaa3c]" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>
                        {isUsed
                          ? "Retirada concluída"
                          : isPaid
                          ? "Pronto para retirada"
                          : "Aguardando pagamento"}
                      </span>
                    </div>

                    {isPaid && (
                      <button
                        onClick={() => handleOpenPickupQR(order.id)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-[#4aaa3c] bg-[#4aaa3c]/10 hover:bg-[#4aaa3c]/20 px-2.5 py-1 rounded-lg border border-[#4aaa3c]/30 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Ver QR de Retirada</span>
                      </button>
                    )}

                    {isPending && (
                      <button
                        onClick={() => {
                          setCurrentOrder(order);
                          setCheckoutStep("PAYMENT");
                        }}
                        className="text-xs font-bold text-[#2d3661] dark:text-[#7de06f] hover:underline"
                      >
                        Pagar PIX
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra Flutuante de Resumo do Carrinho (quando houver itens selecionados) */}
      {totalItemsCount > 0 && checkoutStep === "IDLE" && (
        <div className="fixed bottom-20 left-0 right-0 z-30 max-w-md mx-auto px-4 pointer-events-none">
          <div className="bg-[#2d3661] dark:bg-[#1a203a] text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between pointer-events-auto transition-all animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center space-x-3">
              <div className="relative p-2 bg-white/10 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-[#7de06f]" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#4aaa3c] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#2d3661]">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {totalItemsCount} {totalItemsCount === 1 ? "item selecionado" : "itens selecionados"}
                </p>
                <p className="text-sm font-black text-white">
                  {formatCurrency(totalCartPrice)}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCart}
              className="bg-[#4aaa3c] hover:bg-[#3d9131] text-white font-black px-4 py-2 rounded-xl shadow-md text-xs uppercase tracking-wide flex items-center space-x-1.5"
            >
              <span>Ver Carrinho</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL TRANSAÇÃO DE CHECKOUT / PAGAMENTO / QR DE RETIRADA */}
      {/* ========================================================= */}
      <Modal
        isOpen={checkoutStep !== "IDLE"}
        onClose={handleCloseModal}
        title={
          checkoutStep === "SUMMARY"
            ? "Carrinho de Compras"
            : checkoutStep === "PAYMENT"
            ? "Pagamento PIX"
            : checkoutStep === "SUCCESS"
            ? "Confirmação do Pedido"
            : "QR Code de Retirada"
        }
      >
        {/* ETAPA 1: RESUMO DO CARRINHO */}
        {checkoutStep === "SUMMARY" && (
          <div className="space-y-4">
            {checkoutError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Seu carrinho está vazio. Adicione itens do cardápio para continuar.
                </p>
                <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                  Voltar ao cardápio
                </Button>
              </div>
            ) : (
              <>
                {/* Lista de Itens do Carrinho */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Itens do Pedido ({totalItemsCount})
                  </span>

                  <div className="divide-y divide-slate-200/80 dark:divide-slate-700/80 max-h-60 overflow-y-auto">
                    {cartItems.map(({ product, quantity, subtotal }) => (
                      <div key={product.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {product.nome}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatCurrency(product.preco)} cada • Subtotal:{" "}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(subtotal)}
                            </span>
                          </p>
                        </div>

                        {/* Controles de quantidade dentro do modal */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700 space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQuantity(product.id)}
                              className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs"
                              title="Diminuir"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-slate-800 dark:text-slate-200">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product.id)}
                              className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs"
                              title="Aumentar"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(product.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remover produto do carrinho"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totalizador */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Total do Pedido
                    </span>
                    <span className="text-base font-black text-[#4aaa3c] dark:text-[#7de06f]">
                      {formatCurrency(totalCartPrice)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                  Será gerado um único pedido com todos os itens e um único QR Code para retirada.
                </p>

                <div className="flex space-x-2 pt-1">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleCloseModal}
                    disabled={isProcessing}
                    className="w-1/3 text-xs"
                  >
                    Adicionar mais
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleProceedToPayment}
                    isLoading={isProcessing}
                    disabled={isProcessing}
                    className="w-2/3 font-bold bg-[#2d3661] hover:bg-[#232b4e] text-white text-xs"
                  >
                    <span>Finalizar Pedido</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ETAPA 2: PAGAMENTO PIX SIMULADO COM QR CODE VISUAL */}
        {checkoutStep === "PAYMENT" && currentOrder && (
          <div className="space-y-4 text-center">
            {checkoutError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start space-x-2 text-left">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Cabeçalho do Pagamento */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pedido {formatOrderId(currentOrder.id)}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto truncate">
                {currentOrder.itens && currentOrder.itens.length > 0
                  ? currentOrder.itens.map((it) => `${it.quantidade}x ${it.produto_nome}`).join(", ")
                  : "Itens da Cantina"}
              </p>
              <p className="text-2xl font-black text-[#4aaa3c]">
                {formatCurrency(currentOrder.valor_total)}
              </p>
            </div>

            {/* Container do QR Code Fictício de Pagamento */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2.5">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <QRCodeSVG
                  value={currentOrder.pix_code || `CEEPPLUS-DEMO-PAYMENT-${currentOrder.id.toString().padStart(5, "0")}`}
                  size={150}
                  level="M"
                />
              </div>

              <div className="space-y-0.5">
                <div className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <QrCode className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>PIX — Pagamento demonstrativo</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Ambiente de simulação para a EXPOCEEP
                </p>
              </div>
            </div>

            {/* Código PIX Copiável */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2 text-left">
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Código PIX demonstrativo
              </span>
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                <code className="flex-1 font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all font-semibold">
                  {currentOrder.pix_code || `CEEPPLUS-DEMO-PAYMENT-${currentOrder.id.toString().padStart(5, "0")}`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const codeToCopy =
                      currentOrder.pix_code ||
                      `CEEPPLUS-DEMO-PAYMENT-${currentOrder.id.toString().padStart(5, "0")}`;
                    navigator.clipboard.writeText(codeToCopy);
                    setCopiedPix(true);
                    setTimeout(() => setCopiedPix(false), 2500);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/60 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 shadow-sm flex items-center space-x-1 shrink-0 transition-colors"
                  title="Copiar código PIX"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4aaa3c]" />
                      <span className="text-[#4aaa3c] font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Simulação de Pagamento */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleSimulatePayment}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="w-full font-bold bg-[#4aaa3c] hover:bg-[#3d9131] text-white shadow-md shadow-[#4aaa3c]/20"
            >
              <ShieldCheck className="w-5 h-5 mr-2" />
              Simular pagamento
            </Button>
          </div>
        )}

        {/* ETAPA 3: PAGAMENTO APROVADO & TRANSIÇÃO PARA RETIRADA */}
        {checkoutStep === "SUCCESS" && currentOrder && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-[#4aaa3c]/10 text-[#4aaa3c] flex items-center justify-center mx-auto ring-8 ring-[#4aaa3c]/5">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ✓ Pagamento aprovado
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seu pedido foi confirmado e está pronto para retirada.
              </p>
            </div>

            {/* Card de Detalhes do Pedido Confirmado */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Identificador</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pedido {formatOrderId(currentOrder.id)}
                </span>
              </div>

              {/* Itens do pedido */}
              <div className="space-y-1 py-1 border-y border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Itens a retirar:
                </span>
                {currentOrder.itens && currentOrder.itens.length > 0 ? (
                  currentOrder.itens.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 dark:text-slate-200">{it.produto_nome}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">x{it.quantidade}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-700 dark:text-slate-300">Itens da cantina</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pago</span>
                <span className="text-sm font-bold text-[#4aaa3c]">
                  {formatCurrency(currentOrder.valor_total)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
                <Badge variant="success" size="sm">
                  DISPONÍVEL
                </Badge>
              </div>
            </div>

            {/* Ação Principal: Ver QR de Retirada */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleOpenPickupQR(currentOrder.id)}
              isLoading={isProcessing}
              className="w-full font-bold bg-[#4aaa3c] hover:bg-[#3d9131] text-white shadow-md shadow-[#4aaa3c]/20"
            >
              <QrCode className="w-5 h-5 mr-2" />
              VER QR DE RETIRADA
            </Button>
          </div>
        )}

        {/* ETAPA 4: QR CODE DE RETIRADA REAL */}
        {checkoutStep === "PICKUP_QR" && pickupQRData && (
          <div className="space-y-4 text-center py-1">
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-wider">
                Pedido {formatOrderId(pickupQRData.order_id)}
              </span>

              {/* Lista dos produtos do pedido no QR de retirada */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 space-y-1 text-left max-w-xs mx-auto">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                  Itens a retirar:
                </span>
                {pickupQRData.itens && pickupQRData.itens.length > 0 ? (
                  pickupQRData.itens.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">
                        {it.produto_nome}
                      </span>
                      <span className="font-bold text-[#4aaa3c] dark:text-[#7de06f] shrink-0">
                        x{it.quantidade}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {pickupQRData.produto_nome} (x{pickupQRData.quantidade})
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center space-x-2 pt-1">
                <Badge variant="success" size="sm">
                  DISPONÍVEL
                </Badge>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Total: {formatCurrency(pickupQRData.valor_total)}
                </span>
              </div>
            </div>

            {/* QR Code Único de Retirada */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-[#4aaa3c]/30 dark:border-[#4aaa3c]/40 rounded-3xl p-5 flex flex-col items-center justify-center space-y-2.5 shadow-inner">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                <QRCodeSVG
                  value={pickupQRData.pickup_code}
                  size={190}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-0.5 text-center max-w-xs">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Apresente este QR Code na cantina
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  O operador fará uma única leitura para entregar todos os itens do seu pedido.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleCloseModal}
              className="w-full font-bold text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

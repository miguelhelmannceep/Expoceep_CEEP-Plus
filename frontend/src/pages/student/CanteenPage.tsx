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
  UtensilsCrossed,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  Copy
} from "lucide-react";

type CheckoutStep = "IDLE" | "SUMMARY" | "PAYMENT" | "SUCCESS" | "PICKUP_QR";

export const CanteenPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado do fluxo transacional
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
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
      setProducts(prods);
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

  const handleStartPurchase = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCheckoutError(null);
    setCheckoutStep("SUMMARY");
  };

  const handleProceedToPayment = async () => {
    if (!selectedProduct || isProcessing) return;

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const order = await canteenService.createOrder({
        produto_id: selectedProduct.id,
        quantidade: quantity,
      });
      setCurrentOrder(order);
      setCheckoutStep("PAYMENT");
      canteenService.getOrders().then(setOrders).catch(() => {});
    } catch (err: any) {
      setCheckoutError(err.message || "Não foi possível gerar o pedido. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

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
    setSelectedProduct(null);
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Coffee className="w-5 h-5 text-amber-600" />
          <span>Cantina Escolar</span>
        </h2>
        <p className="text-xs text-slate-500">
          Adquira sua ficha antecipada e retire seu salgado no balcão da cantina.
        </p>
      </div>

      {/* Cardápio / Produtos Ativos */}
      <div className="space-y-4">
        {products.map((p) => (
          <Card key={p.id} className="p-5 space-y-4 border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Ficha Padrão
                </span>
                <h3 className="text-xl font-bold text-slate-900">{p.nome}</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs">
                  {p.descricao || "Escolha seu salgado e retire na cantina após a confirmação do pedido."}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-600">
                  {formatCurrency(p.preco)}
                </span>
                <span className="block text-[11px] text-slate-400 font-medium">unitário</span>
              </div>
            </div>

            {/* Destaques do produto */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Válido para qualquer opção de salgado (assado ou frito).</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Sem filas no caixa: apresentação direta no balcão com QR Code.</span>
              </div>
            </div>

            {/* Botão de Compra */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleStartPurchase(p)}
              className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
            >
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Comprar {p.nome} — {formatCurrency(p.preco)}
            </Button>
          </Card>
        ))}
      </div>

      {/* Histórico de Pedidos do Aluno */}
      {orders.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>Seus Pedidos</span>
          </h3>

          <div className="space-y-2.5">
            {orders.map((order) => {
              const isPaid = order.status === "PAGO";
              const isUsed = order.status === "UTILIZADO";
              const isPending = order.status === "PENDENTE_PAGAMENTO";

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-800">
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
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(order.valor_total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center space-x-1">
                      {isUsed ? (
                        <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                      ) : isPaid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>
                        {order.itens[0]?.produto_nome || "Salgado"} (x{order.itens[0]?.quantidade || 1})
                      </span>
                    </div>

                    {isPaid && (
                      <button
                        onClick={() => handleOpenPickupQR(order.id)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Ver QR de Retirada</span>
                      </button>
                    )}

                    {isPending && (
                      <button
                        onClick={() => {
                          setCurrentOrder(order);
                          setSelectedProduct(products[0] || null);
                          setCheckoutStep("PAYMENT");
                        }}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
                      >
                        Pagar PIX
                      </button>
                    )}

                    {isUsed && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Retirada concluída
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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
            ? "Resumo do Pedido"
            : checkoutStep === "PAYMENT"
            ? "Pagamento PIX"
            : checkoutStep === "SUCCESS"
            ? "Confirmação do Pedido"
            : "QR Code de Retirada"
        }
      >
        {/* ETAPA 1: RESUMO DO PEDIDO */}
        {checkoutStep === "SUMMARY" && selectedProduct && (
          <div className="space-y-4">
            {checkoutError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs font-medium text-slate-500">Item</span>
                <span className="text-sm font-bold text-slate-900">{selectedProduct.nome}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs font-medium text-slate-500">Quantidade</span>
                <span className="text-sm font-semibold text-slate-800">{quantity}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-bold text-slate-700">Total</span>
                <span className="text-lg font-black text-emerald-600">
                  {formatCurrency(selectedProduct.preco * quantity)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              O pedido será criado e vinculado à sua conta de aluno para pagamento via PIX demonstrativo.
            </p>

            <div className="flex space-x-2 pt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={handleCloseModal}
                disabled={isProcessing}
                className="w-1/3"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleProceedToPayment}
                isLoading={isProcessing}
                className="w-2/3 font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                <span>Continuar para pagamento</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 2: PAGAMENTO PIX SIMULADO COM QR CODE VISUAL */}
        {checkoutStep === "PAYMENT" && currentOrder && (
          <div className="space-y-4 text-center">
            {checkoutError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2 text-left">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Cabeçalho do Pagamento */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pedido {formatOrderId(currentOrder.id)}
              </span>
              <h4 className="text-base font-bold text-slate-900">
                {currentOrder.itens[0]?.produto_nome || "Salgado"}
              </h4>
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(currentOrder.valor_total)}
              </p>
            </div>

            {/* Container do QR Code Fictício de Pagamento */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                <QRCodeSVG
                  value={currentOrder.pix_code || `CEEPPLUS-DEMO-PAYMENT-${currentOrder.id.toString().padStart(5, '0')}`}
                  size={160}
                  level="M"
                />
              </div>

              <div className="space-y-0.5">
                <div className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700">
                  <QrCode className="w-3.5 h-3.5 text-slate-500" />
                  <span>PIX — Pagamento demonstrativo</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ambiente de simulação para a ExpoCEEP
                </p>
              </div>
            </div>

            {/* Código PIX Copiável */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-left">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Código PIX demonstrativo
              </span>
              <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <code className="flex-1 font-mono text-xs text-slate-800 break-all select-all font-semibold">
                  {currentOrder.pix_code || `CEEPPLUS-DEMO-PAYMENT-${currentOrder.id.toString().padStart(5, '0')}`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const codeToCopy = currentOrder.pix_code || `CEEPPLUS-DEMO-PAYMENT-${currentOrder.id.toString().padStart(5, '0')}`;
                    navigator.clipboard.writeText(codeToCopy);
                    setCopiedPix(true);
                    setTimeout(() => setCopiedPix(false), 2500);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300/60 rounded-lg text-slate-700 shadow-sm flex items-center space-x-1 shrink-0 transition-colors"
                  title="Copiar código PIX"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Código copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar código</span>
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
              className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <ShieldCheck className="w-5 h-5 mr-2" />
              Simular pagamento
            </Button>
          </div>
        )}


        {/* ETAPA 3: PAGAMENTO APROVADO & TRANSIÇÃO PARA RETIRADA */}
        {checkoutStep === "SUCCESS" && currentOrder && (
          <div className="space-y-4 text-center py-2">
            {/* Ícone de Sucesso */}
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">
                ✓ Pagamento aprovado
              </h4>
              <p className="text-xs text-slate-500">
                Seu pedido foi confirmado.
              </p>
            </div>

            {/* Card de Detalhes do Pedido Confirmado */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Identificador</span>
                <span className="text-xs font-bold text-slate-800">
                  Pedido {formatOrderId(currentOrder.id)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Item</span>
                <span className="text-xs font-bold text-slate-800">
                  {currentOrder.itens[0]?.produto_nome || "Salgado"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Total</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatCurrency(currentOrder.valor_total)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-xs font-medium text-slate-500">Status</span>
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
              className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <QrCode className="w-5 h-5 mr-2" />
              VER QR DE RETIRADA
            </Button>
          </div>
        )}

        {/* ETAPA 4: QR CODE DE RETIRADA REAL (MILESTONE 2B) */}
        {checkoutStep === "PICKUP_QR" && pickupQRData && (
          <div className="space-y-4 text-center py-1">
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-700 tracking-wider">
                Pedido {formatOrderId(pickupQRData.order_id)}
              </span>
              <h4 className="text-base font-bold text-slate-900">
                {pickupQRData.produto_nome} (x{pickupQRData.quantidade})
              </h4>
              <div className="flex items-center justify-center space-x-2 pt-0.5">
                <Badge variant="success" size="sm">
                  DISPONÍVEL
                </Badge>
                <span className="text-xs font-bold text-slate-600">
                  {formatCurrency(pickupQRData.valor_total)}
                </span>
              </div>
            </div>

            {/* QR Code de Retirada */}
            <div className="bg-slate-50 border-2 border-emerald-500/40 rounded-3xl p-6 flex flex-col items-center justify-center space-y-3 shadow-inner">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-100">
                <QRCodeSVG
                  value={pickupQRData.pickup_code}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-1 text-center max-w-xs">
                <p className="text-xs font-bold text-slate-800">
                  Apresente este QR Code na cantina
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  O operador fará a leitura para entrega imediata do seu salgado.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleCloseModal}
              className="w-full font-bold text-slate-700"
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

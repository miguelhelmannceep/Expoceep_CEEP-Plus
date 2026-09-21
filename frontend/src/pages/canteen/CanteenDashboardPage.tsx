import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { canteenService } from "../../services/canteen.service";
import type {
  CanteenTerminalStatus,
  PickupValidationResponse,
  ConfirmPickupResponse,
  Order,
} from "../../types";
import type { CanteenTab } from "../../components/layout/CanteenLayout";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  QrCode,
  ClipboardList,
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  RotateCcw,
  ShieldCheck,
  User,
  ShoppingBag,
  Keyboard,
  RefreshCw,
  UtensilsCrossed,
  Clock,
  PackageCheck,
  ArrowRight,
} from "lucide-react";

interface CanteenDashboardPageProps {
  activeTab: CanteenTab;
  onTabChange?: (tab: CanteenTab) => void;
}

type ScannerState = "IDLE" | "SCANNING" | "VALIDATING" | "VALID_ORDER" | "ERROR" | "CONFIRMED";

export const CanteenDashboardPage: React.FC<CanteenDashboardPageProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [terminalStatus, setTerminalStatus] = useState<CanteenTerminalStatus | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do Scanner
  const [scannerState, setScannerState] = useState<ScannerState>("IDLE");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validationData, setValidationData] = useState<PickupValidationResponse | null>(null);
  const [confirmedData, setConfirmedData] = useState<ConfirmPickupResponse | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Filtros de fila de pedidos
  const [orderFilter, setOrderFilter] = useState<"TODOS" | "PAGOS" | "UTILIZADOS">("TODOS");
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [status, myOrders] = await Promise.all([
        canteenService.getTerminalStatus(),
        canteenService.getOrders().catch(() => []),
      ]);
      setTerminalStatus(status);
      setOrders(myOrders);
    } catch (err: any) {
      setError(err.message || "Erro ao conectar terminal da cantina.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      const myOrders = await canteenService.getOrders();
      setOrders(myOrders);
    } catch (err: any) {
      // Ignora erro suave
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Limpeza do scanner ao desmontar ou trocar de aba
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [activeTab]);

  const stopCameraScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (err) {
        // Ignora erros de parada
      }
      qrScannerRef.current = null;
    }
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setScanErrorMessage(null);
    setScannerState("SCANNING");

    await stopCameraScanner();

    try {
      const html5Qr = new Html5Qrcode("canteen-qr-reader");
      qrScannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async (decodedText) => {
          await stopCameraScanner();
          handleValidateCode(decodedText);
        },
        () => {
          // Frame sem detecção
        }
      );
    } catch (err: any) {
      setCameraError(
        "Câmera indisponível ou permissão não concedida. Utilize a validação por código manual abaixo."
      );
      setScannerState("IDLE");
      setShowManualInput(true);
    }
  };

  const handleValidateCode = async (code: string) => {
    if (!code || !code.trim()) return;

    setScannerState("VALIDATING");
    setScanErrorMessage(null);

    try {
      const result = await canteenService.validatePickup(code.trim());
      setValidationData(result);
      setScannerState("VALID_ORDER");
    } catch (err: any) {
      setScanErrorMessage(err.message || "QR Code inválido ou pedido já retirado.");
      setScannerState("ERROR");
    }
  };

  const handleConfirmPickup = async () => {
    if (!validationData || isConfirming) return;

    setIsConfirming(true);
    setScanErrorMessage(null);

    try {
      const conf = await canteenService.confirmPickup(validationData.order_id);
      setConfirmedData(conf);
      setScannerState("CONFIRMED");
      // Atualiza lista de pedidos em background
      canteenService.getOrders().then(setOrders).catch(() => {});
    } catch (err: any) {
      setScanErrorMessage(err.message || "Não foi possível confirmar a retirada do pedido.");
      setScannerState("ERROR");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResetScanner = () => {
    stopCameraScanner();
    setScannerState("IDLE");
    setValidationData(null);
    setConfirmedData(null);
    setScanErrorMessage(null);
    setCameraError(null);
    setManualCode("");
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;
  const formatOrderId = (id: number) => `#${id.toString().padStart(5, "0")}`;

  if (isLoading) {
    return <LoadingSpinner message="Conectando terminal da cantina..." />;
  }

  if (error || !terminalStatus) {
    return <ErrorMessage message={error || "Erro ao conectar terminal"} onRetry={loadData} />;
  }

  // Métricas para a aba início
  const readyOrdersCount = orders.filter((o) => o.status === "PAGO").length;
  const completedOrdersCount = orders.filter((o) => o.status === "UTILIZADO").length;

  // Filtragem para a fila de pedidos
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "PAGOS") return o.status === "PAGO";
    if (orderFilter === "UTILIZADOS") return o.status === "UTILIZADO";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* ABA 1: PAINEL PRINCIPAL / VISÃO OPERACIONAL */}
      {/* ========================================================================= */}
      {activeTab === "inicio" && (
        <div className="space-y-4">
          {/* Card de Status do Terminal */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4aaa3c] bg-[#4aaa3c]/10 border border-[#4aaa3c]/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                Operação em Tempo Real
              </span>
              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#4aaa3c] bg-[#4aaa3c]/10 px-2.5 py-1 rounded-full border border-[#4aaa3c]/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4aaa3c] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4aaa3c]"></span>
                </span>
                <span>Sistema {terminalStatus.status}</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{terminalStatus.terminal}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Atendente responsável: <span className="text-slate-200">{terminalStatus.atendente}</span>
              </p>
            </div>
          </div>

          {/* Cards de Métricas Operacionais */}
          <div className="grid grid-cols-2 gap-3">
            {/* Prontos para Retirada */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-[#4aaa3c] font-bold">
                <Clock className="w-4 h-4 text-[#4aaa3c]" />
                <span>Prontos no Balcão</span>
              </div>
              <p className="text-3xl font-black text-white">{readyOrdersCount}</p>
              <p className="text-[11px] text-slate-400 font-medium">Aguardando apresentação do QR</p>
            </div>

            {/* Retiradas Concluídas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-bold">
                <PackageCheck className="w-4 h-4 text-slate-400" />
                <span>Entregues Hoje</span>
              </div>
              <p className="text-3xl font-black text-slate-200">{completedOrdersCount}</p>
              <p className="text-[11px] text-slate-400 font-medium">Fichas confirmadas</p>
            </div>
          </div>

          {/* Botão de Ação Rápida para o Scanner */}
          <button
            onClick={() => onTabChange?.("scanner")}
            className="w-full py-4 px-5 bg-[#2d3661] hover:bg-[#232b4d] border border-[#4aaa3c]/40 text-white rounded-2xl font-black text-sm flex items-center justify-between shadow-lg shadow-black/40 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#4aaa3c]/20 text-[#4aaa3c] flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm leading-tight">Iniciar Atendimento QR</p>
                <p className="text-xs text-slate-400 font-normal">Escanear ficha digital do aluno</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#4aaa3c]" />
          </button>

          {/* Card com Guia Rápido Institucional */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2.5">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4aaa3c]" />
              <span>Protocolo de Entrega Rápida</span>
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <p className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-full bg-[#2d3661] text-[#4aaa3c] font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>O estudante apresenta o QR Code de retirada na tela do celular.</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-full bg-[#2d3661] text-[#4aaa3c] font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>O leitor valida a autenticidade e status do pagamento instantaneamente.</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-full bg-[#2d3661] text-[#4aaa3c] font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>O atendente clica em <strong>Confirmar Retirada</strong> e entrega o item.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: SCANNER DE QR CODE & VALIDAÇÃO DE RETIRADA */}
      {/* ========================================================================= */}
      {activeTab === "scanner" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            {/* Cabeçalho do Leitor */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-[#2d3661] text-[#4aaa3c]">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Validação de Retirada
                </h3>
              </div>
              {scannerState !== "IDLE" && (
                <button
                  onClick={handleResetScanner}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Nova Leitura</span>
                </button>
              )}
            </div>

            {/* ESTADO 1: IDLE / PRONTO PARA ATIVAR O SCANNER */}
            {scannerState === "IDLE" && (
              <div className="text-center py-4 sm:py-6 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-[#2d3661]/40 text-[#4aaa3c] border border-[#4aaa3c]/30 flex items-center justify-center mx-auto shadow-inner ring-8 ring-[#4aaa3c]/5">
                  <Camera className="w-10 h-10" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h4 className="text-base font-bold text-white">Pronto para Ler Pedido</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Aponte a câmera para o QR Code de retirada no celular do estudante.
                  </p>
                </div>

                {cameraError && (
                  <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start space-x-2.5 text-left animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{cameraError}</span>
                  </div>
                )}

                {/* Botão Principal Grande e Confortável */}
                <button
                  onClick={startCameraScanner}
                  className="w-full py-4 px-6 font-extrabold bg-[#4aaa3c] hover:bg-[#3d8c32] text-white rounded-xl text-sm shadow-lg shadow-[#4aaa3c]/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
                >
                  <Camera className="w-5 h-5" />
                  <span>ABRIR CÂMERA DO SCANNER</span>
                </button>
              </div>
            )}

            {/* ESTADO 2: SCANNING / CÂMERA ATIVA */}
            {scannerState === "SCANNING" && (
              <div className="space-y-4 text-center animate-in fade-in duration-200">
                <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#4aaa3c]/70 shadow-2xl min-h-[260px] flex items-center justify-center">
                  <div id="canteen-qr-reader" className="w-full" />
                </div>

                <div className="flex items-center justify-center space-x-2 text-xs text-[#4aaa3c] bg-[#4aaa3c]/10 py-2 px-3 rounded-xl border border-[#4aaa3c]/20">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4aaa3c] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4aaa3c]"></span>
                  </span>
                  <span className="font-bold">Aponte a câmera para o QR Code</span>
                </div>

                <button
                  onClick={() => {
                    stopCameraScanner();
                    setScannerState("IDLE");
                  }}
                  className="w-full py-3 font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs border border-slate-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Parar Câmera</span>
                </button>
              </div>
            )}

            {/* ESTADO 3: VALIDATING / CONSULTANDO NO BACKEND */}
            {scannerState === "VALIDATING" && (
              <div className="text-center py-10 space-y-3">
                <LoadingSpinner message="Consultando e autenticando pedido no backend..." />
              </div>
            )}

            {/* ESTADO 4: VALID_ORDER / PEDIDO ENCONTRADO E VÁLIDO */}
            {scannerState === "VALID_ORDER" && validationData && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                {/* Banner de Validação com Sucesso */}
                <div className="p-4 bg-[#4aaa3c]/15 border border-[#4aaa3c]/40 rounded-2xl flex items-center space-x-3 text-[#4aaa3c]">
                  <div className="w-11 h-11 rounded-xl bg-[#4aaa3c]/20 text-[#4aaa3c] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white tracking-wide">✓ PEDIDO VÁLIDO — PRONTO</h4>
                    <p className="text-xs text-[#4aaa3c] font-medium">Pagamento verificado. Disponível para entrega.</p>
                  </div>
                </div>

                {/* Detalhes Estruturados do Pedido */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                      <span>Identificador</span>
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      Pedido {formatOrderId(validationData.order_id)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                    <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Estudante</span>
                    </span>
                    <span className="font-bold text-slate-100 text-sm">
                      {validationData.aluno_nome}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                    <span className="text-slate-400 font-medium">Item & Quantidade</span>
                    <span className="font-extrabold text-white text-sm bg-slate-800/80 px-2.5 py-1 rounded-lg">
                      {validationData.produto_nome} (x{validationData.quantidade})
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                    <span className="text-slate-400 font-medium">Valor Pago</span>
                    <span className="font-black text-[#4aaa3c] text-base">
                      {formatCurrency(validationData.valor_total)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-400 font-medium">Status</span>
                    <span className="text-xs font-bold text-[#4aaa3c] bg-[#4aaa3c]/15 px-2.5 py-0.5 rounded-md border border-[#4aaa3c]/30">
                      PAGO / BALCÃO
                    </span>
                  </div>
                </div>

                {/* Botões de Ação: Confirmar Retirada (Touch Target Grande) */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleConfirmPickup}
                    disabled={isConfirming}
                    className="w-full py-4 px-6 font-black bg-[#4aaa3c] hover:bg-[#3d8c32] text-white rounded-xl text-sm shadow-xl shadow-[#4aaa3c]/20 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50"
                  >
                    {isConfirming ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5 stroke-[3]" />
                    )}
                    <span>{isConfirming ? "CONFIRMANDO RETIRADA..." : "CONFIRMAR RETIRADA DO ITEM"}</span>
                  </button>

                  <button
                    onClick={handleResetScanner}
                    disabled={isConfirming}
                    className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancelar / Ler Outro Pedido
                  </button>
                </div>
              </div>
            )}

            {/* ESTADO 5: CONFIRMED / RETIRADA CONCLUÍDA */}
            {scannerState === "CONFIRMED" && confirmedData && (
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 rounded-full bg-[#4aaa3c]/20 text-[#4aaa3c] flex items-center justify-center mx-auto ring-8 ring-[#4aaa3c]/10">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white">✓ RETIRADA CONCLUÍDA</h4>
                  <p className="text-xs text-slate-400">
                    Pedido {formatOrderId(confirmedData.order_id)} registrado como entregue.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Status final</span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-md">
                      UTILIZADO
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Horário da entrega</span>
                    <span className="font-bold text-slate-100">
                      {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    O QR Code foi invalidado e protegido contra qualquer tentativa de reuso.
                  </div>
                </div>

                <button
                  onClick={handleResetScanner}
                  className="w-full py-4 font-black bg-[#2d3661] hover:bg-[#232b4d] border border-[#4aaa3c]/40 text-white rounded-xl text-sm shadow-lg shadow-black/40 transition-all flex items-center justify-center space-x-2 active:scale-[0.99]"
                >
                  <RotateCcw className="w-4 h-4 mr-1 text-[#4aaa3c]" />
                  <span>PRÓXIMO ATENDIMENTO / NOVA LEITURA</span>
                </button>
              </div>
            )}

            {/* ESTADO 6: ERROR / ERRO DE VALIDAÇÃO OU DUPLICIDADE */}
            {scannerState === "ERROR" && (
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto ring-8 ring-red-500/10">
                  <AlertCircle className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-red-400 uppercase tracking-wide">
                    {scanErrorMessage || "Erro na Validação"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Este código não está disponível para liberação de itens.
                  </p>
                </div>

                <button
                  onClick={handleResetScanner}
                  className="w-full py-3.5 font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4 mr-1 text-slate-400" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            )}

            {/* ENTRADA MANUAL DE FALLBACK */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[11px] text-slate-400 hover:text-[#4aaa3c] flex items-center space-x-1.5 mx-auto transition-colors font-medium py-1 px-2 rounded"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>
                  {showManualInput ? "Ocultar digitação manual" : "Digitar código manualmente (Fallback)"}
                </span>
              </button>

              {showManualInput && (
                <div className="mt-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Código de Retirada (ex: CEEPPLUS-PICKUP-...)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Cole ou digite o código de retirada"
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2d3661]/40 focus:border-[#4aaa3c] font-mono transition-all"
                    />
                    <button
                      onClick={() => handleValidateCode(manualCode)}
                      disabled={!manualCode.trim() || scannerState === "VALIDATING"}
                      className="px-5 py-2.5 font-bold bg-[#2d3661] hover:bg-[#232b4d] text-white rounded-xl text-xs shrink-0 transition-all disabled:opacity-50 active:scale-95"
                    >
                      Validar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: FILA DE PEDIDOS DO BALCÃO */}
      {/* ========================================================================= */}
      {activeTab === "pedidos" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#2d3661] text-[#4aaa3c]">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Fila de Pedidos
              </h3>
            </div>
            <button
              onClick={refreshOrders}
              disabled={isRefreshingOrders}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 transition-all"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Filtro Rápido de Status */}
          <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setOrderFilter("TODOS")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                orderFilter === "TODOS"
                  ? "bg-[#2d3661] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setOrderFilter("PAGOS")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                orderFilter === "PAGOS"
                  ? "bg-[#4aaa3c] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Prontos ({readyOrdersCount})
            </button>
            <button
              onClick={() => setOrderFilter("UTILIZADOS")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                orderFilter === "UTILIZADOS"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Entregues ({completedOrdersCount})
            </button>
          </div>

          {/* Lista de Pedidos */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">
                Nenhum pedido encontrado no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((o) => {
                const isPaid = o.status === "PAGO";
                const isUsed = o.status === "UTILIZADO";
                return (
                  <div
                    key={o.id}
                    className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-xl flex items-center justify-between text-xs gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white">Pedido {formatOrderId(o.id)}</span>
                        {isPaid && (
                          <span className="text-[10px] font-bold text-[#4aaa3c] bg-[#4aaa3c]/15 px-2 py-0.5 rounded border border-[#4aaa3c]/30">
                            PRONTO
                          </span>
                        )}
                        {isUsed && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            RETIRADO
                          </span>
                        )}
                        {!isPaid && !isUsed && (
                          <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            PENDENTE
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400">
                        {o.itens[0]?.produto_nome || "Salgado"} (x{o.itens[0]?.quantidade || 1}) •{" "}
                        <span className="font-semibold text-slate-200">{formatCurrency(o.valor_total)}</span>
                      </p>
                    </div>

                    {isPaid && (
                      <button
                        onClick={() => {
                          onTabChange?.("scanner");
                          if (o.pickup_code) {
                            handleValidateCode(o.pickup_code);
                          } else {
                            handleValidateCode(`CEEPPLUS-PICKUP-${o.pickup_token}`);
                          }
                        }}
                        className="px-3 py-2 bg-[#4aaa3c] hover:bg-[#3d8c32] text-white text-xs font-bold rounded-lg shrink-0 shadow-sm transition-all active:scale-95"
                      >
                        Atender
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


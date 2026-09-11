import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { canteenService } from "../../services/canteen.service";
import type { CanteenTerminalStatus, PickupValidationResponse, ConfirmPickupResponse, Order } from "../../types";
import type { CanteenTab } from "../../components/layout/CanteenLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import {
  QrCode,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  RotateCcw,
  ShieldCheck,
  User,
  ShoppingBag,
  Keyboard
} from "lucide-react";


interface CanteenDashboardPageProps {
  activeTab: CanteenTab;
}

type ScannerState = "IDLE" | "SCANNING" | "VALIDATING" | "VALID_ORDER" | "ERROR" | "CONFIRMED";

export const CanteenDashboardPage: React.FC<CanteenDashboardPageProps> = ({ activeTab }) => {
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
          qrbox: { width: 220, height: 220 },
        },
        async (decodedText) => {
          await stopCameraScanner();
          handleValidateCode(decodedText);
        },
        () => {
          // Frame sem detecção - ignore
        }
      );
    } catch (err: any) {
      setCameraError(
        "Câmera indisponível ou permissão negada. Você pode utilizar a validação manual logo abaixo."
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
      setScanErrorMessage(err.message || "QR Code inválido ou não encontrado.");
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
      // Atualiza pedidos
      canteenService.getOrders().then(setOrders).catch(() => {});
    } catch (err: any) {
      setScanErrorMessage(err.message || "Não foi possível confirmar a retirada.");
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

  return (
    <div className="space-y-4">
      {/* ABA 1: INÍCIO OPERACIONAL */}
      {activeTab === "inicio" && (
        <div className="space-y-4">
          <Card className="bg-slate-950 border-slate-800 text-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Status Operacional
              </span>
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{terminalStatus.status}</span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold">{terminalStatus.terminal}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Operador autenticado: {terminalStatus.atendente}
              </p>
            </div>
          </Card>

          <Card className="bg-slate-950 border-slate-800 text-white p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fluxo de Atendimento Rápido
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              O terminal da cantina foi projetado para operações de alta velocidade durante o intervalo escolar.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-amber-400">1. Aluno apresenta QR Code no smartphone</p>
              <p className="font-semibold text-amber-400">2. Leitor valida autenticidade e status</p>
              <p className="font-semibold text-amber-400">3. Confirmação imediata da entrega</p>
            </div>
          </Card>
        </div>
      )}

      {/* ABA 2: SCANNER DE QR CODE & CONFIRMAÇÃO DE RETIRADA */}
      {activeTab === "scanner" && (
        <div className="space-y-4">
          <Card className="bg-slate-950 border-slate-800 text-white p-5 space-y-4">
            {/* Cabeçalho do Leitor */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Scanner de Retirada</h3>
              </div>
              {scannerState !== "IDLE" && (
                <button
                  onClick={handleResetScanner}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              )}
            </div>

            {/* ESTADO 1: INATIVO / PRONTO PARA ABRIR SCANNER */}
            {scannerState === "IDLE" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h4 className="text-sm font-bold text-white">Pronto para Ler Pedido</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ative a câmera para escanear o QR Code de retirada apresentado pelo aluno.
                  </p>
                </div>

                {cameraError && (
                  <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start space-x-2 text-left">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={startCameraScanner}
                  className="w-full font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Abrir Scanner
                </Button>
              </div>
            )}

            {/* ESTADO 2: CÂMERA ATIVA & ESCANEANDO */}
            {scannerState === "SCANNING" && (
              <div className="space-y-4 text-center">
                <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[260px] flex items-center justify-center">
                  <div id="canteen-qr-reader" className="w-full" />
                </div>

                <div className="flex items-center justify-center space-x-2 text-xs text-amber-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="font-semibold">Câmera ativa: aponte para o QR Code do aluno</span>
                </div>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    stopCameraScanner();
                    setScannerState("IDLE");
                  }}
                  className="w-full font-bold text-slate-300 border-slate-700 hover:bg-slate-800"
                >
                  <CameraOff className="w-4 h-4 mr-2" />
                  Parar Câmera
                </Button>
              </div>
            )}

            {/* ESTADO 3: VALIDANDO TOKEN */}
            {scannerState === "VALIDATING" && (
              <div className="text-center py-10 space-y-3">
                <LoadingSpinner message="Consultando e autenticando pedido no backend..." />
              </div>
            )}

            {/* ESTADO 4: PEDIDO VÁLIDO ENCONTRADO */}
            {scannerState === "VALID_ORDER" && validationData && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-center space-x-3 text-emerald-300">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">✓ PEDIDO VÁLIDO</h4>
                    <p className="text-xs text-emerald-400">Pagamento confirmado e disponível para retirada.</p>
                  </div>
                </div>

                {/* Detalhes do Pedido Validado */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Identificador</span>
                    </span>
                    <span className="font-bold text-white text-sm">
                      Pedido {formatOrderId(validationData.order_id)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Aluno</span>
                    </span>
                    <span className="font-semibold text-slate-200">
                      {validationData.aluno_nome}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Item & Quantidade</span>
                    <span className="font-bold text-amber-400">
                      {validationData.produto_nome} (x{validationData.quantidade})
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Valor Pago</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {formatCurrency(validationData.valor_total)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Status Atual</span>
                    <Badge variant="success" size="sm">
                      DISPONÍVEL
                    </Badge>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleResetScanner}
                    disabled={isConfirming}
                    className="w-1/3 border-slate-700 text-slate-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleConfirmPickup}
                    isLoading={isConfirming}
                    className="w-2/3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    CONFIRMAR RETIRADA
                  </Button>
                </div>
              </div>
            )}

            {/* ESTADO 5: RETIRADA CONFIRMADA */}
            {scannerState === "CONFIRMED" && confirmedData && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                  <Check className="w-9 h-9 stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white">✓ RETIRADA CONFIRMADA</h4>
                  <p className="text-xs text-slate-400">
                    Pedido {formatOrderId(confirmedData.order_id)} registrado como utilizado.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status final</span>
                    <Badge variant="neutral" size="sm">
                      UTILIZADO
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Horário da entrega</span>
                    <span className="font-semibold text-slate-200">
                      {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleResetScanner}
                  className="w-full font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  NOVA LEITURA
                </Button>
              </div>
            )}

            {/* ESTADO 6: ERRO DE LEITURA OU DUPLICIDADE */}
            {scannerState === "ERROR" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto ring-8 ring-rose-500/10">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-rose-400 uppercase tracking-wide">
                    {scanErrorMessage || "Erro na Validação"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Este código não está disponível para liberação de itens.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleResetScanner}
                  className="w-full font-bold bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {/* ENTRADA MANUAL DE FALLBACK (Para testes ou quando a câmera estiver indisponível) */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center space-x-1 mx-auto transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{showManualInput ? "Ocultar digitação manual" : "Digitar código manualmente (Fallback de Teste)"}</span>
              </button>

              {showManualInput && (
                <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Código do QR (ex: CEEPPLUS-PICKUP-...)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Cole ou digite o código de retirada"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleValidateCode(manualCode)}
                      disabled={!manualCode.trim() || scannerState === "VALIDATING"}
                      className="font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0"
                    >
                      Validar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ABA 3: HISTÓRICO / FILA DE PEDIDOS */}
      {activeTab === "pedidos" && (
        <Card className="bg-slate-950 border-slate-800 text-white p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Fila de Pedidos</h3>
            </div>
            <span className="text-xs text-slate-400">Total: {orders.length}</span>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              Nenhum pedido registrado no terminal no momento.
            </p>
          ) : (
            <div className="space-y-2.5">
              {orders.map((o) => {
                const isPaid = o.status === "PAGO";
                const isUsed = o.status === "UTILIZADO";
                return (
                  <div
                    key={o.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">Pedido {formatOrderId(o.id)}</span>
                        {isPaid && <Badge variant="success" size="sm">DISPONÍVEL</Badge>}
                        {isUsed && <Badge variant="neutral" size="sm">RETIRADO</Badge>}
                        {!isPaid && !isUsed && <Badge variant="warning" size="sm">PENDENTE</Badge>}
                      </div>
                      <p className="text-slate-400">
                        {o.itens[0]?.produto_nome || "Salgado"} (x{o.itens[0]?.quantidade || 1}) — {formatCurrency(o.valor_total)}
                      </p>
                    </div>

                    {isPaid && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (o.pickup_code) {
                            handleValidateCode(o.pickup_code);
                          } else {
                            handleValidateCode(`CEEPPLUS-PICKUP-${o.pickup_token}`);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                      >
                        Validar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

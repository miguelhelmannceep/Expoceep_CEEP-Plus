import React, { useState, useEffect } from "react";
import { canteenService } from "../../services/canteen.service";
import type { Product } from "../../types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { ListSkeleton } from "../../components/common/Skeleton";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Coffee, Info, Check, UtensilsCrossed } from "lucide-react";

export const CanteenPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    canteenService
      .getProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <ListSkeleton count={2} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Coffee className="w-5 h-5 text-amber-600" />
          <span>Cantina Escolar</span>
        </h2>
        <p className="text-xs text-slate-500">
          Adquira sua ficha antecipada e retire seu salgado no balcão.
        </p>
      </div>

      {/* Card Principal do Produto */}
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
                R$ {p.preco.toFixed(2).replace(".", ",")}
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
              <span>Sem filas no caixa: apresentação direta no balcão.</span>
            </div>
          </div>

          {/* Botão de Compra */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
          >
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Comprar Salgado — R$ {p.preco.toFixed(2).replace(".", ",")}
          </Button>
        </Card>
      ))}

      {/* Modal Informativo (sem pagamento real ou falso) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Módulo da Cantina">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900">
              Fluxo de Compra em Preparação
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Em breve você poderá realizar o pagamento via PIX simulado e gerar seu QR Code de retirada para apresentar no balcão da cantina.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(false)}
            className="w-full font-semibold"
          >
            Entendido
          </Button>
        </div>
      </Modal>
    </div>
  );
};

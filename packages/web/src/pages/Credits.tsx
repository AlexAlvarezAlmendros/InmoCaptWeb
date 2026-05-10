import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, CardContent } from "@/components/ui";
import { formatPrice, formatRelativeDate } from "@/lib/utils";
import {
  useCreditBalance,
  useCreditPacks,
  useCreditTransactions,
  usePackCheckout,
  useVerifyPackSession,
} from "@/hooks/useCredits";
import type { CreditPack, CreditTransaction } from "@/types";

const TX_LABELS: Record<CreditTransaction["type"], string> = {
  grant_plan: "Créditos del plan",
  grant_topup: "Compra de pack",
  spend_reveal: "Revelado de contacto",
  expire: "Caducados",
  refund: "Reembolso",
  admin_adjust: "Ajuste administrativo",
};

function PackCard({
  pack,
  onBuy,
  isLoading,
}: {
  pack: CreditPack;
  onBuy: () => void;
  isLoading: boolean;
}) {
  const perCredit = pack.priceCents / pack.credits / 100;

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {pack.name}
        </h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">
            {pack.credits}
          </span>
          <span className="text-sm text-slate-500">créditos</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {perCredit.toFixed(2).replace(".", ",")} € por crédito
        </p>
        <div className="mt-auto pt-6">
          <Button
            className="w-full"
            onClick={onBuy}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Comprar · {formatPrice(pack.priceCents, pack.currency)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CreditsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");
  const reason = searchParams.get("reason");

  const { data: balance, isLoading: isLoadingBalance } = useCreditBalance();
  const { data: packs, isLoading: isLoadingPacks } = useCreditPacks();
  const { data: transactions, isLoading: isLoadingTx } =
    useCreditTransactions(50);
  const checkoutMutation = usePackCheckout();
  const verifySession = useVerifyPackSession();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (
      checkoutStatus === "success" &&
      sessionId &&
      !verifiedRef.current &&
      !verifySession.isPending
    ) {
      verifiedRef.current = true;
      verifySession.mutate(sessionId, {
        onSettled: () => {
          const next = new URLSearchParams(searchParams);
          next.delete("session_id");
          setSearchParams(next, { replace: true });
        },
      });
    }
  }, [checkoutStatus, sessionId, verifySession, searchParams, setSearchParams]);

  const handleBuy = (packId: string) => {
    setSelectedPackId(packId);
    checkoutMutation.mutate(packId, {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: () => {
        setSelectedPackId(null);
      },
    });
  };

  const isLoading = isLoadingBalance || isLoadingPacks;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Créditos
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Cada crédito revela el contacto de un inmueble (teléfono + URL).
        </p>
      </div>

      {checkoutStatus === "success" && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          Compra completada. Tus créditos ya están disponibles.
        </div>
      )}
      {reason === "empty" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Te has quedado sin créditos. Compra un pack para seguir revelando
          contactos.
        </div>
      )}

      {/* Balance card */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Saldo actual
                </p>
                <p className="mt-2 text-4xl font-bold text-primary">
                  {balance?.total ?? 0}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium">
                    {balance?.planCredits ?? 0}
                  </span>{" "}
                  del plan (caducan al renovar) +{" "}
                  <span className="font-medium">
                    {balance?.topupCredits ?? 0}
                  </span>{" "}
                  de top-up (sin caducidad)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packs */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        Comprar créditos
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {packs?.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            onBuy={() => handleBuy(pack.id)}
            isLoading={
              checkoutMutation.isPending && selectedPackId === pack.id
            }
          />
        ))}
      </div>

      {/* Transactions */}
      <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900 dark:text-white">
        Historial de movimientos
      </h2>
      {isLoadingTx ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : transactions && transactions.length > 0 ? (
        <Card>
          <CardContent>
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatRelativeDate(tx.createdAt)} · bucket {tx.bucket}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-slate-500">
              Aún no hay movimientos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

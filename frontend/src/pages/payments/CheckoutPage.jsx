import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders } from "../../api/orders";
import { getTables } from "../../api/tables";
import { processPayment } from "../../api/payments";
import AppLayout from "../../components/layout/AppLayout";
import toast from "react-hot-toast";
import { CreditCard, Printer, X } from "lucide-react";
import {
  ORDER_STATUS_LABELS, ORDER_TYPE_COLORS, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS,
  money, orderLabel, orderSubtotal, orderTotal,
} from "../../utils/orders";

function ReceiptModal({ payment, order, tables, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Comprobante</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="text-center border-b pb-4 mb-4">
          <img src="/logo.png" alt="Fooders — Pizzas & Papas" className="w-20 h-20 mx-auto rounded-lg mb-2" />
          <p className="text-gray-500 text-xs">@fooderspy_ · 0983 972 806</p>
          <p className="text-gray-500 text-sm">Comprobante N° {payment.receipt_number}</p>
        </div>
        <div className="space-y-1 text-sm text-gray-700 mb-4">
          <div className="flex justify-between"><span>Pedido</span><span>{orderLabel(order, tables)}</span></div>
          {order?.customer_phone && <div className="flex justify-between"><span>Teléfono</span><span>{order.customer_phone}</span></div>}
          {order?.delivery_address && <div className="flex justify-between gap-4"><span>Dirección</span><span className="text-right">{order.delivery_address}</span></div>}
          <div className="border-t pt-2 mt-2 space-y-0.5">
            {order?.items.filter((i) => i.status !== "cancelled").map((i) => (
              <div key={i.id} className="flex justify-between gap-2">
                <span>{i.quantity}× {i.menu_item_name}</span><span>{money(parseFloat(i.unit_price) * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between"><span>Subtotal</span><span>${parseFloat(payment.subtotal).toFixed(2)}</span></div>
          {parseFloat(payment.discount_amount) > 0 && (
            <div className="flex justify-between text-red-500"><span>Descuento ({payment.discount_pct}%)</span><span>-${parseFloat(payment.discount_amount).toFixed(2)}</span></div>
          )}
          {parseFloat(payment.delivery_fee) > 0 && (
            <div className="flex justify-between"><span>Envío</span><span>{money(payment.delivery_fee)}</span></div>
          )}
          {parseFloat(payment.tip_amount) > 0 && (
            <div className="flex justify-between"><span>Propina</span><span>${parseFloat(payment.tip_amount).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
            <span>TOTAL</span><span>${parseFloat(payment.total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500"><span>Método</span><span>{PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}</span></div>
          {payment.cash_received && (
            <>
              <div className="flex justify-between"><span>Efectivo recibido</span><span>${parseFloat(payment.cash_received).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Vuelto</span><span>${parseFloat(payment.change_given || 0).toFixed(2)}</span></div>
            </>
          )}
        </div>
        <button
          onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium"
        >
          <Printer size={16} /> Imprimir
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const preselectedTableId = searchParams.get("table") ? parseInt(searchParams.get("table")) : null;
  const preselectedOrderId = searchParams.get("order");

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountPct, setDiscountPct] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables().then((r) => r.data),
  });

  const [dismissedPreselect, setDismissedPreselect] = useState(false);
  const preselectedOrder = dismissedPreselect ? null :
    activeOrders.find((o) => o.id === preselectedOrderId) ||
    (preselectedTableId ? activeOrders.find((o) => o.table_id === preselectedTableId) : null);
  const selectedOrder = activeOrders.find((o) => o.id === selectedOrderId) || preselectedOrder;

  const subtotal = orderSubtotal(selectedOrder);
  const deliveryFee = parseFloat(selectedOrder?.delivery_fee || 0);
  const discountAmount = subtotal * (discountPct / 100);
  const total = subtotal - discountAmount + deliveryFee + parseFloat(tipAmount || 0);
  const change = paymentMethod === "cash" && cashReceived ? parseFloat(cashReceived) - total : null;

  const payMutation = useMutation({
    mutationFn: () => processPayment({
      order_id: selectedOrder.id,
      payment_method: paymentMethod,
      discount_pct: discountPct,
      tip_amount: parseFloat(tipAmount || 0),
      cash_received: paymentMethod === "cash" && cashReceived ? parseFloat(cashReceived) : null,
    }),
    onSuccess: (res) => {
      setReceipt(res.data);
      setReceiptOrder(selectedOrder);
      qc.invalidateQueries(["active-orders"]);
      qc.invalidateQueries(["tables"]);
      setSelectedOrderId(null);
      setDismissedPreselect(true);
      setDiscountPct(0);
      setTipAmount(0);
      setCashReceived("");
      toast.success("Pago procesado correctamente");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Error al procesar pago"),
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Caja</h2>

        {!selectedOrder ? (
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Seleccioná un pedido activo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeOrders.filter((o) => !["closed", "cancelled"].includes(o.status)).map((order) => {
                const total = orderTotal(order);
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-orange-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-900">{orderLabel(order, tables)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_TYPE_COLORS[order.order_type]}`}>{ORDER_TYPE_LABELS[order.order_type]}</span>
                    </div>
                    <p className="text-sm text-gray-500">{order.items.length} items · ${total.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                      order.status === "ready" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
                  </button>
                );
              })}
              {activeOrders.filter((o) => !["closed", "cancelled"].includes(o.status)).length === 0 && (
                <p className="text-gray-400 text-sm col-span-2 text-center py-8">No hay pedidos activos</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{orderLabel(selectedOrder, tables)}</h3>
                  {selectedOrder.customer_phone && <p className="text-xs text-gray-500">Tel: {selectedOrder.customer_phone}</p>}
                  {selectedOrder.delivery_address && <p className="text-xs text-gray-500">{selectedOrder.delivery_address}</p>}
                </div>
                <button onClick={() => { setSelectedOrderId(null); setDismissedPreselect(true); }} className="text-gray-400 hover:text-gray-600 text-sm">
                  Cambiar
                </button>
              </div>
              <div className="space-y-2 mb-4">
                {selectedOrder.items.filter((i) => i.status !== "cancelled").map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity}× {item.menu_item_name || `Item #${item.menu_item_id}`}</span>
                    <span className="text-gray-900 font-medium">${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>-${discountAmount.toFixed(2)}</span></div>}
                {deliveryFee > 0 && <div className="flex justify-between"><span className="text-gray-500">Envío</span><span>{money(deliveryFee)}</span></div>}
                {parseFloat(tipAmount) > 0 && <div className="flex justify-between"><span>Propina</span><span>${parseFloat(tipAmount).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-orange-500">${total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Forma de pago</h3>

              <div className="grid grid-cols-3 gap-2">
                {["cash", "card", "transfer"].map((m) => (
                  <button key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      paymentMethod === m ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}>
                    {m === "cash" ? "Efectivo" : m === "card" ? "Tarjeta" : "Transfer."}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Descuento (%)</label>
                  <input type="number" min="0" max="100" value={discountPct}
                    onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Propina ($)</label>
                  <input type="number" min="0" value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Efectivo recibido</label>
                  <input type="number" min="0" value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                  {change !== null && change >= 0 && (
                    <p className="text-green-600 text-sm mt-1 font-medium">Vuelto: ${change.toFixed(2)}</p>
                  )}
                  {change !== null && change < 0 && (
                    <p className="text-red-500 text-sm mt-1">Efectivo insuficiente</p>
                  )}
                </div>
              )}

              <button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending || (paymentMethod === "cash" && cashReceived && parseFloat(cashReceived) < total)}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold"
              >
                <CreditCard size={18} />
                {payMutation.isPending ? "Procesando..." : `Cobrar $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}

        {receipt && (
          <ReceiptModal
            payment={receipt}
            order={receiptOrder}
            tables={tables}
            onClose={() => { setReceipt(null); setReceiptOrder(null); }}
          />
        )}
      </div>
    </AppLayout>
  );
}

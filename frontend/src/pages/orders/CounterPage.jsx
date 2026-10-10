import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, createOrder, sendToKitchen, deliverOrder, cancelOrder } from "../../api/orders";
import AppLayout from "../../components/layout/AppLayout";
import OrderBuilder from "../../components/orders/OrderBuilder";
import { ORDER_STATUS_LABELS, minutesSince, money, orderTotal } from "../../utils/orders";
import toast from "react-hot-toast";
import { ShoppingBag, Bike, Phone, MapPin, Clock, CheckCircle, CreditCard, X } from "lucide-react";

const EMPTY_CUSTOMER = { customer_name: "", customer_phone: "", delivery_address: "", delivery_fee: "" };

function CustomerForm({ orderType, setOrderType, customer, setCustomer }) {
  const field = (key) => ({
    value: customer[key],
    onChange: (e) => setCustomer({ ...customer, [key]: e.target.value }),
    className: "w-full border rounded-lg px-3 py-2 text-sm",
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {[["takeaway", "Para llevar", ShoppingBag], ["delivery", "Delivery", Bike]].map(([type, label, Icon]) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              orderType === type ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 text-gray-600 hover:border-orange-300"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <input placeholder="Nombre del cliente *" {...field("customer_name")} />
      <input placeholder="Teléfono" type="tel" {...field("customer_phone")} />
      {orderType === "delivery" && (
        <>
          <input placeholder="Dirección de entrega *" {...field("delivery_address")} />
          <input placeholder="Costo de envío ($)" type="number" min="0" {...field("delivery_fee")} />
        </>
      )}
    </>
  );
}

function ActiveOrderCard({ order, onDeliver, onCancel, onCharge }) {
  const minutesAgo = minutesSince(order.created_at);
  const isDelivery = order.order_type === "delivery";
  const ready = order.status === "ready";

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${ready ? "border-green-400" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isDelivery ? <Bike size={18} className="text-sky-600" /> : <ShoppingBag size={18} className="text-amber-600" />}
          <p className="font-bold text-gray-900">{order.customer_name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          ready ? "bg-green-100 text-green-700" :
          order.status === "delivered" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700"
        }`}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs text-gray-500">
        {order.customer_phone && <p className="flex items-center gap-1"><Phone size={12} /> {order.customer_phone}</p>}
        {isDelivery && <p className="flex items-center gap-1"><MapPin size={12} /> {order.delivery_address}</p>}
        <p className="flex items-center gap-1"><Clock size={12} /> hace {minutesAgo} min</p>
      </div>

      <ul className="mt-3 text-sm text-gray-700 space-y-0.5">
        {order.items.filter((i) => i.status !== "cancelled").map((i) => (
          <li key={i.id}>{i.quantity}× {i.menu_item_name}{i.notes && <span className="text-gray-400 italic"> — {i.notes}</span>}</li>
        ))}
      </ul>

      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <span className="font-bold text-orange-500">{money(orderTotal(order))}</span>
        <div className="flex gap-1">
          <button onClick={() => onCancel(order)} title="Cancelar pedido"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
            <X size={16} />
          </button>
          {ready && (
            <button onClick={() => onDeliver(order)}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
              <CheckCircle size={13} /> {isDelivery ? "Salió" : "Retirado"}
            </button>
          )}
          <button onClick={() => onCharge(order)}
            className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
            <CreditCard size={13} /> Cobrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CounterPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState("new");
  const [orderType, setOrderType] = useState("takeaway");
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
    refetchInterval: 15000,
  });
  const counterOrders = activeOrders.filter((o) => o.order_type !== "dine_in");

  const deliveryFee = orderType === "delivery" ? parseFloat(customer.delivery_fee) || 0 : 0;
  const customerValid = customer.customer_name.trim() &&
    (orderType !== "delivery" || customer.delivery_address.trim());

  const createMutation = useMutation({
    mutationFn: async (items) => {
      const res = await createOrder({
        order_type: orderType,
        customer_name: customer.customer_name.trim(),
        customer_phone: customer.customer_phone.trim() || null,
        delivery_address: orderType === "delivery" ? customer.delivery_address.trim() : null,
        delivery_fee: deliveryFee,
        items,
      });
      await sendToKitchen(res.data.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(["active-orders"]);
      setCustomer(EMPTY_CUSTOMER);
      toast.success("Pedido enviado a cocina");
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg.replace("Value error, ", "") : detail || "Error al enviar");
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (order) => deliverOrder(order.id),
    onSuccess: () => qc.invalidateQueries(["active-orders"]),
    onError: () => toast.error("Error al actualizar"),
  });

  const cancelMutation = useMutation({
    mutationFn: (order) => cancelOrder(order.id),
    onSuccess: () => { qc.invalidateQueries(["active-orders"]); toast.success("Pedido cancelado"); },
    onError: () => toast.error("Error al cancelar"),
  });

  const tabs = (
    <div className="p-4 border-b bg-white flex items-center gap-2">
      <h2 className="font-bold text-gray-900 mr-4">Mostrador</h2>
      {[["new", "Nuevo pedido"], ["active", `En curso (${counterOrders.length})`]].map(([key, label]) => (
        <button key={key} onClick={() => setTab(key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            tab === key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <AppLayout>
      {tab === "new" ? (
        <OrderBuilder
          header={tabs}
          isPending={createMutation.isPending}
          canSubmit={!!customerValid}
          onSubmit={(items) => createMutation.mutateAsync(items)}
          extraCharges={[{ label: "Envío", amount: deliveryFee }]}
          cartExtra={
            <CustomerForm orderType={orderType} setOrderType={setOrderType} customer={customer} setCustomer={setCustomer} />
          }
        />
      ) : (
        <div>
          {tabs}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {counterOrders.map((order) => (
              <ActiveOrderCard
                key={order.id}
                order={order}
                onDeliver={(o) => deliverMutation.mutate(o)}
                onCancel={(o) => window.confirm(`¿Cancelar el pedido de ${o.customer_name}?`) && cancelMutation.mutate(o)}
                onCharge={(o) => navigate(`/checkout?order=${o.id}`)}
              />
            ))}
            {counterOrders.length === 0 && (
              <p className="text-gray-400 text-sm col-span-full text-center py-16">No hay pedidos para llevar ni delivery en curso</p>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

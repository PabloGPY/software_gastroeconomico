import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, createOrder, addOrderItems, sendToKitchen } from "../../api/orders";
import { getTables } from "../../api/tables";
import AppLayout from "../../components/layout/AppLayout";
import OrderBuilder from "../../components/orders/OrderBuilder";
import toast from "react-hot-toast";
import { ChevronLeft } from "lucide-react";

export default function TableOrderPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables().then((r) => r.data),
  });

  const table = tables.find((t) => t.id === parseInt(tableId));
  const existingOrder = activeOrders.find((o) => o.table_id === parseInt(tableId));

  const sendMutation = useMutation({
    mutationFn: async (items) => {
      let orderId = existingOrder?.id;
      if (!orderId) {
        const res = await createOrder({ order_type: "dine_in", table_id: parseInt(tableId), items });
        orderId = res.data.id;
      } else {
        await addOrderItems(orderId, items);
      }
      await sendToKitchen(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries(["active-orders"]);
      qc.invalidateQueries(["tables"]);
      toast.success("Pedido enviado a cocina");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Error al enviar"),
  });

  return (
    <AppLayout>
      <OrderBuilder
        isPending={sendMutation.isPending}
        onSubmit={(items) => sendMutation.mutateAsync(items)}
        header={
          <div className="p-4 border-b bg-white flex items-center gap-3">
            <button onClick={() => navigate("/floor")} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-bold text-gray-900">Mesa {table?.number ?? tableId}</h2>
            {existingOrder && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">Pedido activo</span>}
          </div>
        }
      />
    </AppLayout>
  );
}

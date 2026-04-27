import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "../../api/menu";
import { getActiveOrders, createOrder, addOrderItems, sendToKitchen, getOrder } from "../../api/orders";
import AppLayout from "../../components/layout/AppLayout";
import toast from "react-hot-toast";
import { ShoppingCart, Send, ChevronLeft, Plus, Minus, Trash2 } from "lucide-react";

export default function TableOrderPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [existingOrderId, setExistingOrderId] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().then((r) => r.data),
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
  });

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    const tableOrder = activeOrders.find((o) => o.table_id === parseInt(tableId) && o.status !== "closed");
    if (tableOrder) setExistingOrderId(tableOrder.id);
  }, [activeOrders, tableId]);

  const currentCategory = categories.find((c) => c.id === activeCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, notes: "" }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0));
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const total = cart.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const items = cart.map((i) => ({ menu_item_id: i.id, quantity: i.qty, notes: i.notes || null }));
      let orderId = existingOrderId;
      if (!orderId) {
        const res = await createOrder({ table_id: parseInt(tableId), items });
        orderId = res.data.id;
        setExistingOrderId(orderId);
      } else {
        await addOrderItems(orderId, items);
      }
      await sendToKitchen(orderId);
      return orderId;
    },
    onSuccess: () => {
      qc.invalidateQueries(["active-orders"]);
      qc.invalidateQueries(["tables"]);
      setCart([]);
      toast.success("Pedido enviado a cocina");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Error al enviar"),
  });

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)]">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-white flex items-center gap-3">
            <button onClick={() => navigate("/floor")} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-bold text-gray-900">Mesa {tableId}</h2>
            {existingOrderId && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">Pedido activo</span>}
          </div>

          <div className="flex gap-2 p-3 border-b bg-white overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
            {currentCategory?.items.filter((i) => i.is_available && i.is_active).map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:border-orange-300 hover:shadow-md transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>}
                <p className="text-orange-500 font-bold mt-2">${parseFloat(item.price).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="w-72 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-gray-500" />
              <h3 className="font-bold text-gray-900">Pedido</h3>
              <span className="ml-auto text-sm text-gray-500">{cart.length} items</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && (
              <p className="text-center text-gray-400 text-sm pt-8">Agregá items del menú</p>
            )}
            {cart.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-900 flex-1">{item.name}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-400 ml-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                    <button onClick={() => changeQty(item.id, 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm text-orange-500 font-medium">
                    ${(parseFloat(item.price) * item.qty).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t">
            <div className="flex justify-between text-sm font-bold mb-3">
              <span>Total</span>
              <span className="text-orange-500">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={cart.length === 0 || sendMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {sendMutation.isPending ? "Enviando..." : "Enviar a cocina"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

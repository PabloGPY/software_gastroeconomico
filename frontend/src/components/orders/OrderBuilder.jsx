import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../../api/menu";
import { money } from "../../utils/orders";
import { ShoppingCart, Send, Plus, Minus, Trash2, PieChart, X } from "lucide-react";

// Menú por categorías + carrito. Soporta pizzas "mitad y mitad" en las categorías
// que lo permiten (se cobran al precio de la mitad más cara, igual que en el backend).
export default function OrderBuilder({
  header,
  cartExtra,
  extraCharges = [],
  submitLabel = "Enviar a cocina",
  canSubmit = true,
  isPending = false,
  onSubmit,
}) {
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [halfMode, setHalfMode] = useState(false);
  const [firstHalf, setFirstHalf] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().then((r) => r.data),
  });

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];
  const halvesAllowed = !!currentCategory?.allows_halves;

  const addLine = (line) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.key === line.key);
      if (existing) return prev.map((i) => i.key === line.key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...line, qty: 1, notes: "" }];
    });
  };

  const handleItemClick = (item) => {
    if (!(halfMode && halvesAllowed)) {
      addLine({ key: `${item.id}`, id: item.id, halfId: null, name: item.name, price: parseFloat(item.price) });
      return;
    }
    if (!firstHalf) {
      setFirstHalf(item);
      return;
    }
    if (firstHalf.id === item.id) {
      addLine({ key: `${item.id}`, id: item.id, halfId: null, name: item.name, price: parseFloat(item.price) });
    } else {
      addLine({
        key: `${firstHalf.id}/${item.id}`,
        id: firstHalf.id,
        halfId: item.id,
        name: `½ ${firstHalf.name} / ½ ${item.name}`,
        price: Math.max(parseFloat(firstHalf.price), parseFloat(item.price)),
      });
    }
    setFirstHalf(null);
    setHalfMode(false);
  };

  const changeQty = (key, delta) => {
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0));
  };
  const setNotes = (key, notes) => setCart((prev) => prev.map((i) => i.key === key ? { ...i, notes } : i));
  const removeFromCart = (key) => setCart((prev) => prev.filter((i) => i.key !== key));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = subtotal + extraCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  const submit = async () => {
    const items = cart.map((i) => ({
      menu_item_id: i.id,
      half_menu_item_id: i.halfId,
      quantity: i.qty,
      notes: i.notes.trim() || null,
    }));
    try {
      await onSubmit(items);
      setCart([]);
    } catch {
      // el padre ya muestra el error; se conserva el carrito para reintentar
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        {header}

        <div className="flex gap-2 p-3 border-b bg-white overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                currentCategory?.id === cat.id
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {halvesAllowed && (
          <div className="px-4 pt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => { setHalfMode(!halfMode); setFirstHalf(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                halfMode ? "bg-orange-500 text-white border-orange-500" : "border-orange-300 text-orange-600 hover:bg-orange-50"
              }`}
            >
              <PieChart size={16} /> Mitad y mitad
            </button>
            {halfMode && (
              <span className="text-sm text-gray-600 flex items-center gap-2">
                {firstHalf ? (
                  <>
                    Primera mitad: <b>{firstHalf.name}</b> — elegí la segunda
                    <button onClick={() => setFirstHalf(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </>
                ) : "Elegí la primera mitad"}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
          {currentCategory?.items.filter((i) => i.is_available && i.is_active).map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`bg-white rounded-xl border shadow-sm p-4 text-left hover:border-orange-300 hover:shadow-md transition-all ${
                firstHalf?.id === item.id ? "border-orange-500 ring-2 ring-orange-200" : "border-gray-100"
              }`}
            >
              <p className="font-medium text-gray-900 text-sm">{item.name}</p>
              {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>}
              <p className="text-orange-500 font-bold mt-2">{money(item.price)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-gray-500" />
            <h3 className="font-bold text-gray-900">Pedido</h3>
            <span className="ml-auto text-sm text-gray-500">{cart.reduce((n, i) => n + i.qty, 0)} items</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 && (
            <p className="text-center text-gray-400 text-sm pt-8">Agregá items del menú</p>
          )}
          {cart.map((item) => (
            <div key={item.key} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-900 flex-1">{item.name}</p>
                <button onClick={() => removeFromCart(item.key)} className="text-gray-400 hover:text-red-400 ml-1">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(item.key, -1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                  <button onClick={() => changeQty(item.key, 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-sm text-orange-500 font-medium">{money(item.price * item.qty)}</p>
              </div>
              <input
                value={item.notes}
                onChange={(e) => setNotes(item.key, e.target.value)}
                placeholder="Nota (ej: sin aceitunas)"
                className="mt-2 w-full text-xs border border-gray-200 rounded px-2 py-1 bg-white"
              />
            </div>
          ))}
        </div>

        {cartExtra && <div className="p-4 border-t space-y-2">{cartExtra}</div>}

        <div className="p-4 border-t">
          {extraCharges.filter((c) => parseFloat(c.amount) > 0).map((c) => (
            <div key={c.label} className="flex justify-between text-sm text-gray-500 mb-1">
              <span>{c.label}</span><span>{money(c.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold mb-3">
            <span>Total</span>
            <span className="text-orange-500">{money(total)}</span>
          </div>
          <button
            onClick={submit}
            disabled={cart.length === 0 || !canSubmit || isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {isPending ? "Enviando..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

// Qué avisos de "listo" recibe cada rol: el mozo los de mesa, el cajero los de mostrador/delivery
const NOTIFY = {
  waiter: (type) => type === "dine_in",
  cashier: (type) => type !== "dine_in",
  admin: () => true,
};

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  } catch {
    // sin audio disponible: queda el aviso visual
  }
}

// Escucha a cocina por WebSocket y avisa (con sonido) cuando un item queda listo para llevar
export default function ReadyNotifier() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const shouldNotify = NOTIFY[user?.role];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !shouldNotify) return;

    let ws;
    let retry;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(`ws://${window.location.hostname}:8001/ws/kitchen?token=${token}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event !== "item_status") return;
        qc.invalidateQueries(["active-orders"]);
        if (data.status === "ready" && shouldNotify(data.order_type)) {
          beep();
          toast.success(`Listo para entregar — ${data.label}: ${data.quantity}× ${data.item_name}`, {
            duration: 8000,
            icon: "🍕",
          });
        }
      };
      // si se corta (p. ej. reinicio del servidor) se reconecta solo
      ws.onclose = () => { if (!closed) retry = setTimeout(connect, 3000); };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [user?.role, qc, shouldNotify]);

  return null;
}

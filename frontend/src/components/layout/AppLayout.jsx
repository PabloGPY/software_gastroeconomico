import Sidebar from "./Sidebar";
import ReadyNotifier from "./ReadyNotifier";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <ReadyNotifier />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}

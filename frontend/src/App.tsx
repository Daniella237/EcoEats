import './App.css';
import { CourierOpsPage } from './components/CourierOpsPage';
import { KitchenOpsPage } from './components/KitchenOpsPage';
import { AppRouterProvider, useAppRouter } from './lib/app-routing';
import { ClientShopPage } from './pages/ClientShopPage';

function RoutedContent() {
  const { pathname } = useAppRouter();
  if (pathname === '/cuisine') {
    return <KitchenOpsPage />;
  }
  if (pathname === '/livreur') {
    return <CourierOpsPage />;
  }
  return <ClientShopPage />;
}

export default function App() {
  return (
    <AppRouterProvider>
      <div className="deliveroo">
        <RoutedContent />
      </div>
    </AppRouterProvider>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, Guard } from './auth/guards';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ResourceListPage from './pages/ResourceListPage';
import ResourceFormPage from './pages/ResourceFormPage';
import OrderDetailPage from './pages/OrderDetailPage';
import VoucherDetailPage from './pages/VoucherDetailPage';
import AccountPage from './pages/AccountPage';
import ProductImportPage from './pages/ProductImportPage';
import { NAV, resources } from './config/resources';

function HomeRedirect() {
  const { can } = useAuth();
  const first = NAV.flatMap((g) => g.items).find((i) => can(i.perm));
  return <Navigate to={first ? first.to : '/account'} replace />;
}

const strip = (p) => p.replace(/^\//, '');

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Guard perm="dashboard.read"><Dashboard /></Guard>} />
        {Object.values(resources).flatMap((r) => {
          const out = [<Route key={r.key} path={strip(r.path)} element={<Guard perm={r.perms.read}><ResourceListPage key={r.key} resource={r} /></Guard>} />];
          if (r.sections && r.perms.create) {
            out.push(<Route key={`${r.key}-new`} path={`${strip(r.path)}/new`} element={<Guard perm={r.perms.create}><ResourceFormPage key={`${r.key}-new`} resource={r} /></Guard>} />);
          }
          if (r.sections && !r.customDetail && !r.noDetail) {
            out.push(<Route key={`${r.key}-edit`} path={`${strip(r.path)}/:id`} element={<Guard perm={r.perms.read}><ResourceFormPage key={`${r.key}-edit`} resource={r} /></Guard>} />);
          }
          return out;
        })}
        <Route path="products/import" element={<Guard perm="products.create"><ProductImportPage /></Guard>} />
        <Route path="orders/:id" element={<Guard perm="orders.read"><OrderDetailPage /></Guard>} />
        <Route path="vouchers/:id" element={<Guard perm="vouchers.read"><VoucherDetailPage /></Guard>} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<div className="page"><div className="panel empty"><span className="empty-icon" aria-hidden>?</span><h2>Page not found</h2><p>Check the address or pick a section from the menu.</p></div></div>} />
      </Route>
    </Routes>
  );
}

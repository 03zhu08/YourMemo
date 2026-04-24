import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QuickCapture from './components/QuickCapture';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/capture" element={<QuickCapture />} />
        <Route path="/*" element={<Layout><Dashboard /></Layout>} />
      </Routes>
    </HashRouter>
  );
}

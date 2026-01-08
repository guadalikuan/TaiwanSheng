import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import BunkerApp from './components/BunkerApp';
import DespairBunker from './components/DespairBunker';
import BlackMarket from './components/BlackMarket';
import MyLoadout from './components/MyLoadout';
import MyAssets from './components/MyAssets';
import AgentApp from './components/AgentApp';
import TWSApp from './components/TWSApp';
import ArsenalEntry from './components/ArsenalEntry';
import CommandCenter from './components/CommandCenter';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import ArsenalLoginPage from './components/ArsenalLoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import MarketDetailPage from './components/MarketDetailPage';
import MapNodeDetailPage from './components/MapNodeDetailPage';
import AssetDetailPage from './components/AssetDetailPage';
import MapAssetDetailPage from './components/MapAssetDetailPage';
import ChanganLetter from './components/ChanganLetter';
import TelegramHome from './telegramapp/TelegramHome';
import Market from './telegramapp/Market';
import PredictionHome from './components/PredictionMarket/PredictionHome';
import BettingHistory from './components/PredictionMarket/BettingHistory';
import TechProjectCreate from './components/TechProjectCreate';
import TechProjectDetail from './components/TechProjectDetail';
import MyInvestments from './components/MyInvestments';
import AdminDashboard from './components/AdminDashboard';
import AuctionPage from './auction/AuctionPage';
import EventListPage from './components/EventListPage';
import AuctionListPage from './auction/AuctionListPage';
import AuctionCreatePage from './auction/AuctionCreatePage';
import ArsenalProtectedRoute from './components/ArsenalProtectedRoute';
import UserManagement from './components/UserManagement';
import AncestorMarker from './components/AncestorMarker';
import AssetPoolManagement from './components/AssetPoolManagement';
import RWABuyRequest from './components/RWABuyRequest';
import RWARecommendations from './components/RWARecommendations';
import RWAMarketplace from './components/RWAMarketplace';
import RWABuyRequest from './components/RWABuyRequest';
import RWARecommendations from './components/RWARecommendations';
import RWAMarketplace from './components/RWAMarketplace';
import { ArsenalAuthProvider } from './contexts/ArsenalAuthContext';

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/events" element={<EventListPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/arsenal/login" element={<ArsenalLoginPage />} />
    <Route path="/bunker" element={<DespairBunker />} />
    <Route path="/bunker-old" element={<BunkerApp />} />
    <Route path="/market" element={<BlackMarket />} />
    <Route path="/loadout" element={<MyLoadout />} />
    <Route path="/my-assets" element={<MyAssets />} />
    <Route path="/agent" element={<AgentApp />} />
    <Route path="/app" element={<TWSApp />} />
    {/* 资产入库页面需要认证和特定角色 */}
    <Route 
      path="/arsenal" 
      element={
        <ProtectedRoute 
          allowedRoles={['SUBMITTER', 'ADMIN']} 
          redirectTo="/arsenal/login"
        >
          <ArsenalEntry />
        </ProtectedRoute>
      } 
    />
    <Route path="/command" element={<CommandCenter />} />
    <Route path="/market-detail" element={<MarketDetailPage />} />
    <Route path="/map-node/:id" element={<MapNodeDetailPage />} />
    <Route path="/asset-detail/:id" element={<AssetDetailPage />} />
    <Route path="/map-asset/:id" element={<MapAssetDetailPage />} />
    <Route path="/letter" element={<ChanganLetter />} />
    <Route path="/tg" element={<TelegramHome />} /> 
    <Route path="/tg-market" element={<Market />} />
    <Route path="/predict" element={<PredictionHome />} />
    <Route path="/predict/history" element={<BettingHistory />} />
    <Route path="/tech-project/create" element={<TechProjectCreate />} />
    <Route path="/tech-project/:id" element={<TechProjectDetail />} />
    <Route path="/my-investments" element={<MyInvestments />} />
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    {/* 用户管理页面（仅管理员） */}
    <Route 
      path="/admin/users" 
      element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <UserManagement />
        </ProtectedRoute>
      } 
    />
    {/* 资产池管理页面 */}
    <Route 
      path="/asset-pool" 
      element={
        <ProtectedRoute allowedRoles={['ADMIN', 'REVIEWER']}>
          <AssetPoolManagement />
        </ProtectedRoute>
      } 
    />
    <Route path="/auction" element={<AuctionPage />} />
    <Route path="/auction/:assetId" element={<AuctionPage />} />
    <Route path="/auctions" element={<AuctionListPage />} />
    <Route path="/auctions/create" element={<AuctionCreatePage />} />
    <Route path="/mark-origin" element={<AncestorMarker />} />
    <Route path="/mark-property" element={<AncestorMarker />} />
    {/* RWA交易路由 */}
    <Route path="/rwa/buy-request" element={<RWABuyRequest />} />
    <Route path="/rwa/recommendations" element={<RWARecommendations />} />
    <Route path="/rwa/marketplace" element={<RWAMarketplace />} />
  </Routes>
);

export default App;


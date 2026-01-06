import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import BunkerApp from './components/BunkerApp';
import BlackMarket from './components/BlackMarket';
import MyLoadout from './components/MyLoadout';
import AgentApp from './components/AgentApp';
import TWSApp from './components/TWSApp';
import ArsenalEntry from './components/ArsenalEntry';
import CommandCenter from './components/CommandCenter';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import MarketDetailPage from './components/MarketDetailPage';
import MapNodeDetailPage from './components/MapNodeDetailPage';
import AssetDetailPage from './components/AssetDetailPage';
import MapAssetDetailPage from './components/MapAssetDetailPage';
import ChanganLetter from './components/ChanganLetter';
import ProtectedRoute from './components/ProtectedRoute';
import ArsenalProtectedRoute from './components/ArsenalProtectedRoute';
import UserManagement from './components/UserManagement';
import MyAssets from './components/MyAssets';
import { ArsenalAuthProvider } from './contexts/ArsenalAuthContext';

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/bunker" element={<BunkerApp />} />
    <Route path="/market" element={<BlackMarket />} />
    <Route path="/loadout" element={<MyLoadout />} />
    <Route path="/agent" element={<AgentApp />} />
    <Route path="/app" element={<TWSApp />} />
    {/* 资产入库需要登录（SUBMITTER、DEVELOPER或ADMIN权限）- 使用独立认证系统 */}
    <Route 
      path="/arsenal" 
      element={
        <ArsenalAuthProvider>
          <ArsenalProtectedRoute allowedRoles={['SUBMITTER', 'DEVELOPER', 'ADMIN']}>
            <ArsenalEntry />
          </ArsenalProtectedRoute>
        </ArsenalAuthProvider>
      } 
    />
    {/* 审核端需要 REVIEWER、DEVELOPER 或 ADMIN 权限 */}
    <Route 
      path="/command" 
      element={
        <ProtectedRoute allowedRoles={['REVIEWER', 'DEVELOPER', 'ADMIN']}>
          <CommandCenter />
        </ProtectedRoute>
      } 
    />
    {/* 用户管理页面（仅管理员） */}
    <Route 
      path="/admin/users" 
      element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <UserManagement />
        </ProtectedRoute>
      } 
    />
    {/* 我的资产页面（开发商和提交者） */}
    <Route 
      path="/my-assets" 
      element={
        <ProtectedRoute allowedRoles={['SUBMITTER', 'DEVELOPER', 'ADMIN']}>
          <MyAssets />
        </ProtectedRoute>
      } 
    />
    <Route path="/market-detail" element={<MarketDetailPage />} />
    <Route path="/map-node/:id" element={<MapNodeDetailPage />} />
    <Route path="/asset-detail/:id" element={<AssetDetailPage />} />
    <Route path="/map-asset/:id" element={<MapAssetDetailPage />} />
    <Route path="/letter" element={<ChanganLetter />} />
  </Routes>
);

export default App;


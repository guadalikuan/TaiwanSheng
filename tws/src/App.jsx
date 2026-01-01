import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import BunkerApp from './components/BunkerApp';
import DespairBunker from './components/DespairBunker';
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
import TelegramHome from './telegramapp/TelegramHome';
import Market from './telegramapp/Market';
import PredictionHome from './components/PredictionMarket/PredictionHome';
import BettingHistory from './components/PredictionMarket/BettingHistory';

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/bunker" element={<DespairBunker />} />
    <Route path="/bunker-old" element={<BunkerApp />} />
    <Route path="/market" element={<BlackMarket />} />
    <Route path="/loadout" element={<MyLoadout />} />
    <Route path="/agent" element={<AgentApp />} />
    <Route path="/app" element={<TWSApp />} />
    <Route path="/arsenal" element={<ArsenalEntry />} />
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
  </Routes>
);

export default App;


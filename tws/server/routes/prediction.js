import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { solanaBlockchain, placePredictionBet, consumeToTreasury, platformTransfer, transferPlatformFeeToTreasury } from '../utils/solanaBlockchain.js';
import { put, get, getAll, NAMESPACES } from '../utils/rocksdb.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get all bets
const getBets = async () => {
    const betsData = await getAll(NAMESPACES.PREDICTION_BETS);
    return betsData.map(item => item.value);
};

// Helper to save multiple bets (batch update)
const saveBets = async (bets) => {
    for (const bet of bets) {
        await put(NAMESPACES.PREDICTION_BETS, String(bet.id), bet);
    }
};

// 迁移逻辑：如果数据库为空但JSON文件存在，则初始化数据库
const initPredictionData = async () => {
    try {
        const existingMarkets = await getAll(NAMESPACES.PREDICTION_MARKETS);
        if (existingMarkets.length === 0) {
            const MARKETS_FILE = path.join(__dirname, '../data/predictionMarkets.json');
            const MARKETS_BAK_FILE = path.join(__dirname, '../data/predictionMarkets.json.bak');
            if (fs.existsSync(MARKETS_FILE)) {
                const markets = JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf-8'));
                for (const market of markets) {
                    await put(NAMESPACES.PREDICTION_MARKETS, String(market.id), market);
                }
                fs.renameSync(MARKETS_FILE, MARKETS_BAK_FILE);
                console.log(`[Migration] Migrated ${markets.length} prediction markets to RocksDB`);
            }
        }

        const existingBets = await getAll(NAMESPACES.PREDICTION_BETS);
        if (existingBets.length === 0) {
            const DATA_FILE = path.join(__dirname, '../data/predictionBets.json');
            const DATA_BAK_FILE = path.join(__dirname, '../data/predictionBets.json.bak');
            if (fs.existsSync(DATA_FILE)) {
                const bets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
                for (const bet of bets) {
                    await put(NAMESPACES.PREDICTION_BETS, String(bet.id), bet);
                }
                fs.renameSync(DATA_FILE, DATA_BAK_FILE);
                console.log(`[Migration] Migrated ${bets.length} prediction bets to RocksDB`);
            }
        }
    } catch (error) {
        console.error('[Migration] Error initializing prediction data:', error);
    }
};

// 启动时尝试迁移
initPredictionData();

// Middleware: Admin Permission Check
const checkAdminPermission = (req, res, next) => {
    const adminSecret = process.env.ADMIN_SECRET || 'tws-admin-secret-888';
    const authHeader = req.headers['x-admin-secret'];
    
    if (authHeader !== adminSecret) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Admin access required' });
    }
    next();
};

// GET /api/prediction/markets - Get all markets
router.get('/markets', async (req, res) => {
    try {
        const marketsData = await getAll(NAMESPACES.PREDICTION_MARKETS);
        const markets = marketsData.map(item => item.value);
        // 按ID排序
        markets.sort((a, b) => Number(a.id) - Number(b.id));
        res.json({ success: true, data: markets });
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/prediction/markets - Update markets (Admin only)
router.post('/markets', checkAdminPermission, async (req, res) => {
    try {
        const { markets } = req.body;
        if (!Array.isArray(markets)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }
        
        for (const market of markets) {
            await put(NAMESPACES.PREDICTION_MARKETS, String(market.id), market);
        }
        
        res.json({ success: true, message: 'Markets updated successfully' });
    } catch (error) {
        console.error('Error saving markets:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/prediction/bet - Record a new bet
router.post('/bet', async (req, res) => {
    try {
        const { walletAddress, marketId, direction, amount, signature, timestamp } = req.body;
        
        if (!walletAddress || !marketId || !direction || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // 使用tot合约的consume_to_treasury进行下注（类型PredictionBet=5）
        let betTransaction = null;
        try {
            const betResult = await placePredictionBet(walletAddress, amount, marketId, direction);
            betTransaction = betResult.transaction;
        } catch (error) {
            console.error('下注交易构建失败:', error);
            return res.status(400).json({ 
                success: false, 
                message: '下注交易构建失败: ' + error.message 
            });
        }

        const newBet = {
            id: Date.now().toString(),
            walletAddress,
            marketId,
            direction, // 'YES' or 'NO'
            amount,
            signature,
            timestamp: timestamp || new Date().toISOString(),
            status: 'PENDING', // PENDING, WON, LOST, REFUNDED
            betTransaction: betTransaction, // 下注交易（需要用户签名）
        };
        
        await put(NAMESPACES.PREDICTION_BETS, newBet.id, newBet);
        
        res.json({ 
            success: true, 
            bet: newBet,
            transaction: betTransaction // 返回交易供用户签名
        });
    } catch (error) {
        console.error('Error recording bet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/prediction/verify-bet - 验证预测下注交易
router.post('/verify-bet', async (req, res) => {
    try {
        const { txSignature, walletAddress, amount, marketId, direction } = req.body;
        
        if (!txSignature || !walletAddress || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: txSignature, walletAddress, amount' 
            });
        }

        // 验证交易
        const { verifyStrategicAssetPurchase } = await import('../utils/solanaBlockchain.js');
        try {
            const verificationResult = await verifyStrategicAssetPurchase(
                txSignature,
                walletAddress,
                amount
            );

            if (!verificationResult.success) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction verification failed',
                    message: '交易验证失败'
                });
            }

            // 更新下注记录状态
            const allBets = await getBets();
            const bet = allBets.find(b => 
                b.walletAddress === walletAddress && 
                b.marketId == marketId && 
                b.direction === direction &&
                b.status === 'PENDING'
            );

            if (bet) {
                bet.status = 'CONFIRMED';
                bet.txHash = txSignature;
                await saveBets(allBets);
            }

            res.json({
                success: true,
                message: 'Bet transaction verified successfully',
                bet: bet,
                blockchain: {
                    txHash: txSignature,
                    confirmed: verificationResult.confirmed,
                    blockTime: verificationResult.blockTime
                }
            });
        } catch (error) {
            console.error('Error verifying transaction:', error);
            return res.status(400).json({
                success: false,
                error: 'Transaction verification error',
                message: error.message
            });
        }
    } catch (error) {
        console.error('Error verifying bet:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// POST /api/prediction/distribute - Distribute prizes for a market
router.post('/distribute', checkAdminPermission, async (req, res) => {
    try {
        const { marketId, winningOutcome } = req.body; // winningOutcome: 'YES' or 'NO'
        
        if (!marketId || !winningOutcome) {
            return res.status(400).json({ success: false, message: 'Missing marketId or winningOutcome' });
        }

        // 1. Get all bets for this market
        const allBets = await getBets();
        const marketBets = allBets.filter(b => b.marketId == marketId && b.status === 'PENDING');
        
        if (marketBets.length === 0) {
            return res.json({ success: false, message: 'No pending bets found for this market.' });
        }

        // 2. Calculate pools
        const poolYes = marketBets.filter(b => b.direction === 'YES').reduce((sum, b) => sum + Number(b.amount), 0);
        const poolNo = marketBets.filter(b => b.direction === 'NO').reduce((sum, b) => sum + Number(b.amount), 0);
        const totalPool = poolYes + poolNo;
        
        if (totalPool === 0) {
            return res.json({ success: false, message: 'Pool is empty.' });
        }

        // 3. Identify winners and calculate shares
        const winningBets = marketBets.filter(b => b.direction === winningOutcome);
        const winningPool = winningOutcome === 'YES' ? poolYes : poolNo;
        const TREASURY_ADDRESS = 'JBuwuVzAFDZWVW4o63PtYfLvPGHbSNnRMv5hPzcstyK6';
        
        if (winningBets.length === 0) {
            // No winners, everything goes to treasury
             const distributions = [{
                wallet: TREASURY_ADDRESS,
                amount: totalPool,
                betId: 'market-closure-transfer'
            }];
            // We can process this transfer if we want to move funds from Hot Wallet to Treasury
             // For now just return message
            return res.json({ success: true, message: 'No winners. Pool kept in treasury.', distributions: [] });
        }

        // Apply Platform Fee (e.g. 5%)
        const FEE_PERCENT = 0.05;
        const feeAmount = totalPool * FEE_PERCENT;
        const distributablePool = totalPool - feeAmount;

        const winnerDistributions = winningBets.map(bet => {
            const share = Number(bet.amount) / winningPool;
            const prize = share * distributablePool;
            return {
                wallet: bet.walletAddress,
                amount: prize, // In TOT amount
                betId: bet.id
            };
        });

        console.log(`Distributing ${distributablePool} TOT to ${winningBets.length} winners + ${feeAmount} fee to Treasury`);

        // 4. Execute transfers via TOT contract
        // Note: Ideally we check if solanaBlockchain is initialized and has a wallet
        if (!solanaBlockchain.wallet) {
            // Simulation Mode if no wallet key provided
            console.warn("⚠️ Treasury wallet not loaded. Simulating distribution.");
            
            // Update local records as PAID
            const updatedBets = allBets.map(b => {
                if (b.marketId == marketId && b.status === 'PENDING') {
                    if (b.direction === winningOutcome) return { ...b, status: 'WON_PAID' };
                    else return { ...b, status: 'LOST' };
                }
                return b;
            });
            await saveBets(updatedBets);
            
            return res.json({ 
                success: true, 
                message: 'Distribution simulated (Treasury wallet not active)',
                distributions: winnerDistributions 
            });
        }

        // Real Distribution using TOT contract
        const results = [];
        
        // 4.1. 分发奖励给获胜者（使用platform_transfer，免税）
        for (const dist of winnerDistributions) {
            try {
                const result = await platformTransfer(dist.wallet, dist.amount);
                results.push({
                    wallet: dist.wallet,
                    success: true,
                    txHash: result.txHash,
                    amount: dist.amount,
                    betId: dist.betId
                });
            } catch (error) {
                console.error(`❌ 奖励分发失败 ${dist.wallet}:`, error);
                results.push({
                    wallet: dist.wallet,
                    success: false,
                    error: error.message,
                    betId: dist.betId
                });
            }
        }
        
        // 4.2. 平台费用转给财库（从平台钱包转给TWS财库）
        if (feeAmount > 0) {
            try {
                const feeResult = await transferPlatformFeeToTreasury(feeAmount);
                results.push({
                    wallet: TREASURY_ADDRESS,
                    success: true,
                    txHash: feeResult.txHash,
                    amount: feeAmount,
                    betId: 'platform-fee'
                });
                console.log(`✅ 平台费用已转给财库: ${feeAmount} TOT, Tx: ${feeResult.txHash}`);
            } catch (error) {
                console.error(`❌ 平台费用转账失败:`, error);
                results.push({
                    wallet: TREASURY_ADDRESS,
                    success: false,
                    error: error.message,
                    betId: 'platform-fee'
                });
            }
        }
        
        // 5. Update bet status based on results
        const finalBets = allBets.map(b => {
            if (b.marketId == marketId && b.status === 'PENDING') {
                if (b.direction === winningOutcome) {
                    // Check if this specific user was paid
                    const result = results.find(r => r.wallet === b.walletAddress && r.betId === b.id);
                    if (result && result.success) {
                        return { 
                            ...b, 
                            status: 'WON_PAID',
                            payoutTx: result.txHash,
                            payoutAmount: result.amount,
                            payoutTime: new Date().toISOString()
                        };
                    } else {
                        return { 
                            ...b, 
                            status: 'WON_FAILED',
                            payoutError: result ? result.error : 'Not included in distribution'
                        };
                    }
                } else {
                    return { ...b, status: 'LOST' };
                }
            }
            return b;
        });
        await saveBets(finalBets);

        res.json({ 
            success: true, 
            message: 'Distribution executed', 
            details: results 
        });

    } catch (error) {
        console.error('Distribution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;


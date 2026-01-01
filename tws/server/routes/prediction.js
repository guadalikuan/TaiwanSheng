import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { solanaBlockchain } from '../utils/solanaBlockchain.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/predictionBets.json');

// Helper to read bets
const getBets = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
};

// Helper to save bets
const saveBets = (bets) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bets, null, 2));
};

// Middleware: Admin Permission Check
const checkAdminPermission = (req, res, next) => {
    const adminSecret = process.env.ADMIN_SECRET || 'tws-admin-secret-888';
    const authHeader = req.headers['x-admin-secret'];
    
    if (authHeader !== adminSecret) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Admin access required' });
    }
    next();
};

// POST /api/prediction/bet - Record a new bet
router.post('/bet', (req, res) => {
    try {
        const { walletAddress, marketId, direction, amount, signature, timestamp } = req.body;
        
        if (!walletAddress || !marketId || !direction || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const bets = getBets();
        const newBet = {
            id: Date.now().toString(),
            walletAddress,
            marketId,
            direction, // 'YES' or 'NO'
            amount,
            signature,
            timestamp: timestamp || new Date().toISOString(),
            status: 'PENDING' // PENDING, WON, LOST, REFUNDED
        };
        
        bets.push(newBet);
        saveBets(bets);
        
        res.json({ success: true, bet: newBet });
    } catch (error) {
        console.error('Error recording bet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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
        const allBets = getBets();
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

        const distributions = winningBets.map(bet => {
            const share = Number(bet.amount) / winningPool;
            const prize = share * distributablePool;
            return {
                wallet: bet.walletAddress,
                amount: prize, // In TWS amount
                betId: bet.id
            };
        });

        // Add Fee Transfer to Treasury
        if (feeAmount > 0) {
            distributions.push({
                wallet: TREASURY_ADDRESS,
                amount: feeAmount,
                betId: 'platform-fee'
            });
        }

        console.log(`Distributing ${distributablePool} TWS to ${winningBets.length} winners + ${feeAmount} fee to Treasury`);

        // 4. Execute transfers via SolanaBlockchainService
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
            saveBets(updatedBets);
            
            return res.json({ 
                success: true, 
                message: 'Distribution simulated (Treasury wallet not active)',
                distributions 
            });
        }

        // Real Distribution
        const results = await solanaBlockchain.distributePredictionRewards(distributions);
        
        // 5. Update bet status based on results
        const finalBets = allBets.map(b => {
            if (b.marketId == marketId && b.status === 'PENDING') {
                if (b.direction === winningOutcome) {
                    // Check if this specific user was paid
                    const result = results.find(r => r.wallet === b.walletAddress);
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
        saveBets(finalBets);

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

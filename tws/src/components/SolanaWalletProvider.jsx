import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter, WalletConnectWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaWalletProvider = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    // Auto-detect environment: 'production' -> Mainnet (Mainnet-Beta), otherwise -> Devnet
    const network = import.meta.env.MODE === 'production' 
        ? WalletAdapterNetwork.Mainnet 
        : WalletAdapterNetwork.Devnet;

    // Log the current environment for verification
    React.useEffect(() => {
        console.log(`[TWS Wallet] Environment: ${import.meta.env.MODE}, Network: ${network}`);
    }, [network]);

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            /**
             * Select the wallets you wish to support, by instantiating wallet adapters here.
             *
             * Common adapters can be found in the npm package `@solana/wallet-adapter-wallets`.
             * That package supports tree shaking and lazy loading -- only the wallets you import
             * will be compiled into your application, and only the dependencies of wallets that
             * your users connect to will be loaded.
             */
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new WalletConnectWalletAdapter({
                network,
                options: {
                    projectId: '3a8170812b534d0ff9d794f19a901d64', // Placeholder Project ID (WalletConnect Cloud)
                    metadata: {
                        name: 'TWS Prediction Market',
                        description: 'TaiwanSheng Prediction Market',
                        url: 'https://tws.io',
                        icons: ['https://avatars.githubusercontent.com/u/37784886']
                    },
                },
            }),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

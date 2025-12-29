import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("prediction_market", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PredictionMarket as Program<any>;

  let mint: PublicKey;
  let userTokenAccount: any;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let betPda: PublicKey;

  // Test data
  const question = "Test Market: Will TWS hit $100?";
  const endTimestamp = new Date().getTime() / 1000 + 3600; // 1 hour later
  const amountToBet = new anchor.BN(20000 * 1000000); // 20k tokens (above 10k threshold)

  it("Is initialized!", async () => {
    // 1. Create Mint
    mint = await createMint(
      provider.connection,
      (provider.wallet as any).payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // 2. Mint tokens to User (Provider Wallet)
    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      provider.wallet.publicKey
    );

    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      userTokenAccount.address,
      provider.wallet.publicKey,
      100000 * 1000000 // Mint 100k tokens
    );

    // 3. Find PDAs
    [marketPda] = await PublicKey.findProgramAddress(
      [Buffer.from("market"), Buffer.from(question)],
      program.programId
    );

    [vaultPda] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    // 4. Initialize Market
    await program.methods
      .initializeMarket(question, new anchor.BN(endTimestamp))
      .accounts({
        market: marketPda,
        marketVault: vaultPda,
        tokenMint: mint,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda) as any;
    assert.equal(marketAccount.question, question);
    assert.equal(marketAccount.totalPoolYes.toNumber(), 0);
  });

  it("Places a bet (YES)", async () => {
    // Find Bet PDA
    [betPda] = await PublicKey.findProgramAddress(
      [Buffer.from("bet"), marketPda.toBuffer(), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .placeBet(amountToBet, { yes: {} }) // Enum variant Yes
      .accounts({
        market: marketPda,
        userTokenAccount: userTokenAccount.address,
        marketVault: vaultPda,
        bet: betPda,
        user: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda) as any;
    assert.equal(marketAccount.totalPoolYes.toString(), amountToBet.toString());
    
    const betAccount = await program.account.bet.fetch(betPda) as any;
    assert.equal(betAccount.amountYes.toString(), amountToBet.toString());
  });

  it("God Mode Resolution (Admin Only)", async () => {
    await program.methods
      .resolveMarket({ yes: {} }) // Resolve as YES
      .accounts({
        market: marketPda,
        authority: provider.wallet.publicKey, // Must be admin
      })
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda) as any;
    assert.isTrue(marketAccount.isResolved);
    assert.deepEqual(marketAccount.outcome, { yes: {} });
  });

  it("Claims Reward", async () => {
    const balanceBefore = (await getAccount(provider.connection, userTokenAccount.address)).amount;

    await program.methods
      .claimReward()
      .accounts({
        market: marketPda,
        marketVault: vaultPda,
        bet: betPda,
        userTokenAccount: userTokenAccount.address,
        tokenMint: mint,
        user: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const balanceAfter = (await getAccount(provider.connection, userTokenAccount.address)).amount;
    
    // We were the only better, so we get back (Amount - 5% Fee)
    // Actually if we are the only winner, we get 100% of the pool?
    // Logic: (MyBet / TotalWinPool) * TotalPool
    // If MyBet = TotalWinPool = TotalPool, then Ratio = 1.
    // Reward = TotalPool.
    // Fee = 5%.
    // Receive = 95%.
    
    const expectedReward = amountToBet.mul(new anchor.BN(95)).div(new anchor.BN(100));
    const actualReceived = new anchor.BN(balanceAfter.toString()).sub(new anchor.BN(balanceBefore.toString()));

    // Allow small rounding diffs if any, but should be exact here
    assert.equal(actualReceived.toString(), expectedReward.toString());
  });
});

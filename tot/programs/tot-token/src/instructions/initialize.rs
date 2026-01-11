use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;
use solana_program::program::invoke;
use spl_token_2022::{
    extension::ExtensionType,
    state::Mint,
    instruction as token_2022_instruction,
};
use spl_token_2022::extension::transfer_fee::instruction::initialize_transfer_fee_config;
use spl_token_2022::extension::metadata_pointer::instruction::initialize as initialize_metadata_pointer;
use spl_token_2022::extension::transfer_hook::instruction::initialize as initialize_transfer_hook;

use crate::constants::*;
use crate::state::config::*;
use crate::errors::TotError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub mint: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + TotConfig::LEN,
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,
    
    /// CHECK: Validated in handler
    pub transfer_hook_program: Option<AccountInfo<'info>>,
    
    pub token_program: Interface<'info, TokenInterface>,
    
    pub system_program: Program<'info, System>,
    
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, _params: InitializeParams) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let config = &mut ctx.accounts.config;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let rent = &ctx.accounts.rent;
    
    // Create local variables for keys to avoid temporary borrowing issues
    let authority_key = authority.key();
    let mint_key = mint.key();
    let token_program_key = token_program.key();
    
    let mut extensions = vec![
        ExtensionType::TransferFeeConfig,
        ExtensionType::PermanentDelegate,
        ExtensionType::MetadataPointer,
    ];
    if ctx.accounts.transfer_hook_program.is_some() {
        extensions.push(ExtensionType::TransferHook);
    }
    
    let mint_space = ExtensionType::try_calculate_account_len::<Mint>(&extensions)
        .map_err(|_| TotError::InvalidMint)?;
    
    let mint_rent = rent.minimum_balance(mint_space);
    
    anchor_lang::system_program::create_account(
        CpiContext::new(
            system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: authority.to_account_info(),
                to: mint.to_account_info(),
            },
        ),
        mint_rent,
        mint_space as u64,
        &token_program_key,
    )?;
    
    let initial_fee_basis_points: u16 = 50;
    let max_fee: u64 = u64::MAX;
    
    invoke(
        &initialize_transfer_fee_config(
            &token_program_key,
            &mint_key,
            Some(&authority_key),
            Some(&authority_key),
            initial_fee_basis_points,
            max_fee,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    invoke(
        &token_2022_instruction::initialize_permanent_delegate(
            &token_program_key,
            &mint_key,
            &authority_key,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    invoke(
        &initialize_metadata_pointer(
            &token_program_key,
            &mint_key,
            Some(authority_key),
            Some(mint_key),
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;
    
    if let Some(hook_program) = &ctx.accounts.transfer_hook_program {
        invoke(
            &initialize_transfer_hook(
                &token_program_key,
                &mint_key,
                Some(authority_key),
                Some(hook_program.key()),
            )?,
            &[
                mint.to_account_info(),
            ],
        )?;
    }
    
    invoke(
        &token_2022_instruction::initialize_mint2(
            &token_program_key,
            &mint_key,
            &authority_key,
            Some(&authority_key),
            TOKEN_DECIMALS,
        )?,
        &[
            mint.to_account_info(),
        ],
    )?;

    let clock = Clock::get()?;
    config.authority = authority_key;
    config.mint = mint_key;
    config.treasury = authority_key;
    config.liquidity_pool = _params.liquidity_pool.unwrap_or(Pubkey::default());
    config.tax_config = _params.tax_config.unwrap_or(Pubkey::default());
    config.panic_mode = false;
    config.initialized_at = clock.unix_timestamp;
    config.total_minted = 0;
    config.total_burned = 0;
    config.total_tax_collected = 0;
    config.version = 1;
    config._reserved = [0; 128];

    Ok(())
}

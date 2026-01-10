// ============================================
// 文件: programs/tot-token/src/instructions/tax.rs
// 税率管理指令
// ============================================

use anchor_lang::prelude::*;
use crate::state::config::TotConfig;
use crate::state::tax::TaxConfig;
use crate::constants::seeds;
use crate::errors::TotError;
use crate::utils::validation::validate_tax_rate;

/// 初始化税率配置
#[derive(Accounts)]
pub struct InitializeTaxConfig<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + TaxConfig::LEN,
        seeds = [seeds::TAX_CONFIG_SEED],
        bump
    )]
    pub tax_config: Account<'info, TaxConfig>,

    pub system_program: Program<'info, System>,
}

/// 初始化税率配置处理器
pub fn initialize_tax_config_handler(ctx: Context<InitializeTaxConfig>) -> Result<()> {
    let tax_config = &mut ctx.accounts.tax_config;
    let clock = Clock::get()?;

    // 使用默认值初始化
    tax_config.base_tax_bps = crate::constants::tax::BASE_TAX_BPS;
    tax_config.alpha = crate::constants::tax::ALPHA_COEFFICIENT;
    tax_config.beta = crate::constants::tax::BETA_EXPONENT;
    tax_config.gamma_bps = crate::constants::tax::GAMMA_WEIGHT_BPS;
    tax_config.panic_threshold_bps = crate::constants::tax::PANIC_THRESHOLD_BPS;
    tax_config.panic_tax_bps = crate::constants::tax::PANIC_TAX_BPS;
    tax_config.enabled = true;
    tax_config.exempt_addresses = vec![];
    tax_config.last_updated = clock.unix_timestamp;
    tax_config.bump = ctx.bumps.tax_config;

    msg!("Tax config initialized");
    Ok(())
}

/// 更新税率配置
#[derive(Accounts)]
pub struct UpdateTaxConfig<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    #[account(
        mut,
        seeds = [seeds::TAX_CONFIG_SEED],
        bump = tax_config.bump
    )]
    pub tax_config: Account<'info, TaxConfig>,
}

/// 更新税率配置处理器
pub fn update_tax_config_handler(
    ctx: Context<UpdateTaxConfig>,
    base_tax_bps: Option<u16>,
    alpha: Option<u64>,
    beta: Option<u64>,
    gamma_bps: Option<u16>,
    panic_threshold_bps: Option<u16>,
    panic_tax_bps: Option<u16>,
) -> Result<()> {
    let tax_config = &mut ctx.accounts.tax_config;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    if let Some(base) = base_tax_bps {
        validate_tax_rate(base)?;
        tax_config.base_tax_bps = base;
    }

    if let Some(a) = alpha {
        tax_config.alpha = a;
    }

    if let Some(b) = beta {
        tax_config.beta = b;
    }

    if let Some(gamma) = gamma_bps {
        validate_bps(gamma, 10000)?;
        tax_config.gamma_bps = gamma;
    }

    if let Some(threshold) = panic_threshold_bps {
        validate_bps(threshold, 10000)?;
        tax_config.panic_threshold_bps = threshold;
    }

    if let Some(panic_tax) = panic_tax_bps {
        validate_tax_rate(panic_tax)?;
        tax_config.panic_tax_bps = panic_tax;
    }

    tax_config.last_updated = timestamp;

    emit!(TaxConfigUpdated {
        base_tax_bps: tax_config.base_tax_bps,
        alpha: tax_config.alpha,
        beta: tax_config.beta,
        gamma_bps: tax_config.gamma_bps,
        timestamp,
    });

    Ok(())
}

/// 管理免税地址
#[derive(Accounts)]
pub struct ManageTaxExempt<'info> {
    #[account(
        constraint = authority.key() == config.authority @ TotError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [seeds::CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, TotConfig>,

    #[account(
        mut,
        seeds = [seeds::TAX_CONFIG_SEED],
        bump = tax_config.bump
    )]
    pub tax_config: Account<'info, TaxConfig>,
}

/// 添加免税地址处理器
pub fn add_tax_exempt_handler(
    ctx: Context<ManageTaxExempt>,
    address: Pubkey,
) -> Result<()> {
    let tax_config = &mut ctx.accounts.tax_config;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    tax_config.add_exempt(address)?;

    msg!("Added tax exempt address: {}", address);
    
    emit!(TaxExemptAdded {
        address,
        timestamp,
    });

    Ok(())
}

/// 移除免税地址处理器
pub fn remove_tax_exempt_handler(
    ctx: Context<ManageTaxExempt>,
    address: Pubkey,
) -> Result<()> {
    let tax_config = &mut ctx.accounts.tax_config;
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    
    tax_config.remove_exempt(&address)?;

    msg!("Removed tax exempt address: {}", address);
    
    emit!(TaxExemptRemoved {
        address,
        timestamp,
    });

    Ok(())
}

use crate::utils::validation::validate_bps;

/// 税率配置更新事件
#[event]
pub struct TaxConfigUpdated {
    pub base_tax_bps: u16,
    pub alpha: u64,
    pub beta: u64,
    pub gamma_bps: u16,
    pub timestamp: i64,
}

/// 免税地址添加事件
#[event]
pub struct TaxExemptAdded {
    pub address: Pubkey,
    pub timestamp: i64,
}

/// 免税地址移除事件
#[event]
pub struct TaxExemptRemoved {
    pub address: Pubkey,
    pub timestamp: i64,
}

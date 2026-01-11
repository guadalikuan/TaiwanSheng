use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod utils;

use crate::instructions::admin::{EmergencyWithdraw, SetPaused, UpdateAuthority};
use crate::instructions::holder::{FreezeHolder, InitializeHolder, UnfreezeHolder};
use crate::instructions::init_pool::InitPool;
use crate::instructions::initialize::Initialize;
use crate::instructions::mint_to_pools::MintToPools;
use crate::instructions::query::{CalculateTax, GetHolderStats, HolderStats, TaxCalculationResult};
use crate::instructions::tax::{InitializeTaxConfig, ManageTaxExempt, UpdateTaxConfig};
use crate::instructions::transfer::TransferWithTax;
use state::{
    InitializeParams,
    PoolType,
};

declare_id!("ToT1111111111111111111111111111111111111111");

pub mod __client_accounts_initialize {
    pub use crate::instructions::initialize::__client_accounts_initialize::*;
}

pub mod __client_accounts_init_pool {
    pub use crate::instructions::init_pool::__client_accounts_init_pool::*;
}

pub mod __client_accounts_mint_to_pools {
    pub use crate::instructions::mint_to_pools::__client_accounts_mint_to_pools::*;
}

pub mod __client_accounts_initialize_tax_config {
    pub use crate::instructions::tax::__client_accounts_initialize_tax_config::*;
}

pub mod __client_accounts_update_tax_config {
    pub use crate::instructions::tax::__client_accounts_update_tax_config::*;
}

pub mod __client_accounts_manage_tax_exempt {
    pub use crate::instructions::tax::__client_accounts_manage_tax_exempt::*;
}

pub mod __client_accounts_add_tax_exempt {
    pub use crate::instructions::tax::__client_accounts_manage_tax_exempt::*;
}

pub mod __client_accounts_remove_tax_exempt {
    pub use crate::instructions::tax::__client_accounts_manage_tax_exempt::*;
}

pub mod __client_accounts_initialize_holder {
    pub use crate::instructions::holder::__client_accounts_initialize_holder::*;
}

pub mod __client_accounts_freeze_holder {
    pub use crate::instructions::holder::__client_accounts_freeze_holder::*;
}

pub mod __client_accounts_unfreeze_holder {
    pub use crate::instructions::holder::__client_accounts_unfreeze_holder::*;
}

pub mod __client_accounts_transfer_with_tax {
    pub use crate::instructions::transfer::__client_accounts_transfer_with_tax::*;
}

pub mod __client_accounts_update_authority {
    pub use crate::instructions::admin::__client_accounts_update_authority::*;
}

pub mod __client_accounts_set_paused {
    pub use crate::instructions::admin::__client_accounts_set_paused::*;
}

pub mod __client_accounts_emergency_withdraw {
    pub use crate::instructions::admin::__client_accounts_emergency_withdraw::*;
}

pub mod __client_accounts_calculate_tax {
    pub use crate::instructions::query::__client_accounts_calculate_tax::*;
}

pub mod __client_accounts_get_holder_stats {
    pub use crate::instructions::query::__client_accounts_get_holder_stats::*;
}

#[program]
pub mod tot_token {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        params: InitializeParams,
    ) -> Result<()> {
        crate::instructions::initialize::handler(ctx, params)
    }

    pub fn init_pool(
        ctx: Context<InitPool>,
        pool_type: PoolType,
    ) -> Result<()> {
        crate::instructions::init_pool::handler(ctx, pool_type)
    }

    pub fn mint_to_pools(ctx: Context<MintToPools>) -> Result<()> {
        crate::instructions::mint_to_pools::handler(ctx)
    }

    pub fn initialize_tax_config(ctx: Context<InitializeTaxConfig>) -> Result<()> {
        crate::instructions::tax::initialize_tax_config_handler(ctx)
    }

    pub fn update_tax_config(
        ctx: Context<UpdateTaxConfig>,
        base_tax_bps: Option<u16>,
        alpha: Option<u64>,
        beta: Option<u64>,
        gamma_bps: Option<u16>,
        panic_threshold_bps: Option<u16>,
        panic_tax_bps: Option<u16>,
    ) -> Result<()> {
        crate::instructions::tax::update_tax_config_handler(
            ctx,
            base_tax_bps,
            alpha,
            beta,
            gamma_bps,
            panic_threshold_bps,
            panic_tax_bps,
        )
    }

    pub fn add_tax_exempt(ctx: Context<ManageTaxExempt>, address: Pubkey) -> Result<()> {
        crate::instructions::tax::add_tax_exempt_handler(ctx, address)
    }

    pub fn remove_tax_exempt(ctx: Context<ManageTaxExempt>, address: Pubkey) -> Result<()> {
        crate::instructions::tax::remove_tax_exempt_handler(ctx, address)
    }

    pub fn initialize_holder(ctx: Context<InitializeHolder>) -> Result<()> {
        crate::instructions::holder::initialize_holder_handler(ctx)
    }

    pub fn freeze_holder(ctx: Context<FreezeHolder>, reason: u8) -> Result<()> {
        crate::instructions::holder::freeze_holder_handler(ctx, reason)
    }

    pub fn unfreeze_holder(ctx: Context<UnfreezeHolder>) -> Result<()> {
        crate::instructions::holder::unfreeze_holder_handler(ctx)
    }

    pub fn transfer_with_tax(
        ctx: Context<TransferWithTax>, 
        amount: u64,
        is_sell: bool,
    ) -> Result<()> {
        crate::instructions::transfer::transfer_with_tax_handler(ctx, amount, is_sell)
    }

    pub fn update_authority(ctx: Context<UpdateAuthority>, new_authority: Pubkey) -> Result<()> {
        crate::instructions::admin::update_authority_handler(ctx, new_authority)
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        crate::instructions::admin::set_paused_handler(ctx, paused)
    }

    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        crate::instructions::admin::emergency_withdraw_handler(ctx, amount)
    }

    pub fn calculate_tax(
        ctx: Context<CalculateTax>,
        amount: u64,
        is_buy: bool,
        is_sell: bool,
    ) -> Result<TaxCalculationResult> {
        crate::instructions::query::calculate_tax_handler(ctx, amount, is_buy, is_sell)
    }

    pub fn get_holder_stats(ctx: Context<GetHolderStats>) -> Result<HolderStats> {
        crate::instructions::query::get_holder_stats_handler(ctx)
    }
}

use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct TaxConfig {
    pub base_tax_bps: u16,
    pub alpha: u64,
    pub beta: u64,
    pub gamma_bps: u16,
    pub panic_threshold_bps: u16,
    pub panic_tax_bps: u16,
    pub enabled: bool,
    pub exempt_addresses: Vec<Pubkey>,
    pub last_updated: i64,
    pub bump: u8,
}

impl TaxConfig {
    pub const LEN: usize = 8 + 
        2 + 
        8 + 
        8 + 
        2 + 
        2 + 
        2 + 
        1 + 
        4 + 
        (32 * 50) + 
        8 + 
        1; 
    
    pub fn is_exempt(&self, address: &Pubkey) -> bool {
        self.exempt_addresses.contains(address)
    }
    
    pub fn add_exempt(&mut self, address: Pubkey) -> Result<()> {
        require!(
            !self.exempt_addresses.contains(&address),
            crate::errors::TotError::AddressAlreadyExempt
        );
        
        require!(
            self.exempt_addresses.len() < 50,
            crate::errors::TotError::TooManyExemptAddresses
        );
        
        self.exempt_addresses.push(address);
        Ok(())
    }
    
    pub fn remove_exempt(&mut self, address: &Pubkey) -> Result<()> {
        let index = self.exempt_addresses
            .iter()
            .position(|&x| x == *address)
            .ok_or(anchor_lang::error!(crate::errors::TotError::AddressNotExempt))?;
        
        self.exempt_addresses.remove(index);
        Ok(())
    }
}

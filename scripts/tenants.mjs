// Tenant registry for the Bank Jatim group (shared by seed/provision scripts).
// Keep in sync with src/lib/tenant.ts (the runtime registry).
export const TENANTS = [
  { kode: 'jatim',       nama: 'Bank Jatim',        schema_name: 't_bank_jatim',        is_group: true,  urutan: 1 },
  { kode: 'lampung',     nama: 'Bank Lampung',      schema_name: 't_bank_lampung',      is_group: false, urutan: 2 },
  { kode: 'ntb_syariah', nama: 'Bank NTB Syariah',  schema_name: 't_bank_ntb_syariah',  is_group: false, urutan: 3 },
  { kode: 'ntt',         nama: 'Bank NTT',          schema_name: 't_bank_ntt',          is_group: false, urutan: 4 },
  { kode: 'sultra',      nama: 'Bank Sultra',       schema_name: 't_bank_sultra',       is_group: false, urutan: 5 },
  { kode: 'banten',      nama: 'Bank Banten',       schema_name: 't_bank_banten',       is_group: false, urutan: 6 },
]

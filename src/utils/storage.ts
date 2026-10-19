import {
  CompanyProfile,
  Client,
  Product,
  Quote,
  TermsTemplate,
  CurrencyConfig,
  GoogleSheetsConfig,
} from '../types';
import {
  INITIAL_COMPANY_PROFILE,
  INITIAL_CLIENTS,
  INITIAL_PRODUCTS,
  INITIAL_QUOTES,
  DEFAULT_TERMS_TEMPLATES,
} from './defaultData';

const STORAGE_KEYS = {
  COMPANY: 'cotizapro_company_v1',
  CLIENTS: 'cotizapro_clients_v1',
  PRODUCTS: 'cotizapro_products_v1',
  QUOTES: 'cotizapro_quotes_v1',
  TERMS: 'cotizapro_terms_v1',
  SHEETS_CONFIG: 'cotizapro_sheets_config_v1',
};

// Safe JSON parser
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage`, err);
  }
}

// ----------------------------------------------------
// Company
// ----------------------------------------------------
export function getCompanyProfile(): CompanyProfile {
  const comp = safeGet<CompanyProfile>(STORAGE_KEYS.COMPANY, INITIAL_COMPANY_PROFILE);
  if (!comp.taxIdLabel) {
    comp.taxIdLabel = INITIAL_COMPANY_PROFILE.taxIdLabel || 'RUC';
  }
  if (!comp.digitalWallets) {
    comp.digitalWallets = INITIAL_COMPANY_PROFILE.digitalWallets || {
      yape: { enabled: true, phone: comp.phone || '', holderName: comp.legalName || comp.name, qrCodeUrl: '' },
      plin: { enabled: true, phone: comp.phone || '', holderName: comp.legalName || comp.name, qrCodeUrl: '' },
      otherWallets: [],
    };
  }
  if (comp.defaultPricesIncludeTax === undefined) {
    comp.defaultPricesIncludeTax = INITIAL_COMPANY_PROFILE.defaultPricesIncludeTax ?? false;
  }
  if (!comp.taxName) {
    comp.taxName = INITIAL_COMPANY_PROFILE.taxName || 'IGV';
  }
  return comp;
}

export function saveCompanyProfile(profile: CompanyProfile): CompanyProfile {
  safeSet(STORAGE_KEYS.COMPANY, profile);
  return profile;
}

// ----------------------------------------------------
// Clients
// ----------------------------------------------------
export function getClients(): Client[] {
  return safeGet<Client[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
}

export function saveClients(clients: Client[]): void {
  safeSet(STORAGE_KEYS.CLIENTS, clients);
}

export function upsertClient(client: Client): Client[] {
  const current = getClients();
  const exists = current.some((c) => c.id === client.id);
  const updated = exists
    ? current.map((c) => (c.id === client.id ? client : c))
    : [client, ...current];
  saveClients(updated);
  return updated;
}

export function deleteClient(id: string): Client[] {
  const current = getClients();
  const updated = current.filter((c) => c.id !== id);
  saveClients(updated);
  return updated;
}

// ----------------------------------------------------
// Products
// ----------------------------------------------------
export function getProducts(): Product[] {
  return safeGet<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
}

export function saveProducts(products: Product[]): void {
  safeSet(STORAGE_KEYS.PRODUCTS, products);
}

export function upsertProduct(product: Product): Product[] {
  const current = getProducts();
  const exists = current.some((p) => p.id === product.id);
  const updated = exists
    ? current.map((p) => (p.id === product.id ? product : p))
    : [product, ...current];
  saveProducts(updated);
  return updated;
}

export function deleteProduct(id: string): Product[] {
  const current = getProducts();
  const updated = current.filter((p) => p.id !== id);
  saveProducts(updated);
  return updated;
}

// ----------------------------------------------------
// Quotes
// ----------------------------------------------------
export function getQuotes(): Quote[] {
  return safeGet<Quote[]>(STORAGE_KEYS.QUOTES, INITIAL_QUOTES);
}

export function saveQuotes(quotes: Quote[]): void {
  safeSet(STORAGE_KEYS.QUOTES, quotes);
}

export function upsertQuote(quote: Quote): Quote[] {
  const current = getQuotes();
  const exists = current.some((q) => q.id === quote.id);
  const updated = exists
    ? current.map((q) => (q.id === quote.id ? quote : q))
    : [quote, ...current];
  saveQuotes(updated);
  return updated;
}

export function deleteQuote(id: string): Quote[] {
  const current = getQuotes();
  const updated = current.filter((q) => q.id !== id);
  saveQuotes(updated);
  return updated;
}

// ----------------------------------------------------
// Terms Templates
// ----------------------------------------------------
export function getTermsTemplates(): TermsTemplate[] {
  return safeGet<TermsTemplate[]>(STORAGE_KEYS.TERMS, DEFAULT_TERMS_TEMPLATES);
}

export function saveTermsTemplates(templates: TermsTemplate[]): void {
  safeSet(STORAGE_KEYS.TERMS, templates);
}

export function upsertTermsTemplate(template: TermsTemplate): TermsTemplate[] {
  const current = getTermsTemplates();
  const exists = current.some((t) => t.id === template.id);
  const updated = exists
    ? current.map((t) => (t.id === template.id ? template : t))
    : [...current, template];
  saveTermsTemplates(updated);
  return updated;
}

export function deleteTermsTemplate(id: string): TermsTemplate[] {
  const current = getTermsTemplates();
  const updated = current.filter((t) => t.id !== id);
  saveTermsTemplates(updated);
  return updated;
}

// ----------------------------------------------------
// Folio Generator
// ----------------------------------------------------
export function getNextFolio(): { folio: string; nextNumber: number } {
  const company = getCompanyProfile();
  const year = new Date().getFullYear();
  const nextNum = company.nextQuoteNumber || 101;
  const folio = `${company.quotePrefix || 'COT-'}${year}-${nextNum}`;
  return { folio, nextNumber: nextNum + 1 };
}

export function incrementQuoteNumber(): void {
  const company = getCompanyProfile();
  company.nextQuoteNumber = (company.nextQuoteNumber || 101) + 1;
  saveCompanyProfile(company);
}

// ----------------------------------------------------
// Currency Formatter
// ----------------------------------------------------
export function formatCurrency(
  amount: number,
  currency?: CurrencyConfig
): string {
  if (isNaN(amount)) amount = 0;
  const cfg = currency || getCompanyProfile().currency;
  const decimals = cfg.decimals !== undefined ? cfg.decimals : 2;

  // Format number with commas or periods according to standard conventions
  const parts = amount.toFixed(decimals).split('.');
  const integerFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber =
    decimals > 0 ? `${integerFormatted}.${parts[1]}` : integerFormatted;

  if (cfg.position === 'suffix') {
    return `${formattedNumber} ${cfg.symbol}`;
  }
  return `${cfg.symbol} ${formattedNumber}`;
}

// ----------------------------------------------------
// Export / Import / Reset
// ----------------------------------------------------
export function exportAllData(): string {
  const bundle = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    company: getCompanyProfile(),
    clients: getClients(),
    products: getProducts(),
    quotes: getQuotes(),
    terms: getTermsTemplates(),
  };
  return JSON.stringify(bundle, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.company) safeSet(STORAGE_KEYS.COMPANY, data.company);
    if (Array.isArray(data.clients)) safeSet(STORAGE_KEYS.CLIENTS, data.clients);
    if (Array.isArray(data.products)) safeSet(STORAGE_KEYS.PRODUCTS, data.products);
    if (Array.isArray(data.quotes)) safeSet(STORAGE_KEYS.QUOTES, data.quotes);
    if (Array.isArray(data.terms)) safeSet(STORAGE_KEYS.TERMS, data.terms);
    return true;
  } catch (err) {
    console.error('Import error:', err);
    return false;
  }
}

export function resetToDemoData(): void {
  safeSet(STORAGE_KEYS.COMPANY, INITIAL_COMPANY_PROFILE);
  safeSet(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  safeSet(STORAGE_KEYS.QUOTES, INITIAL_QUOTES);
  safeSet(STORAGE_KEYS.TERMS, DEFAULT_TERMS_TEMPLATES);
}

// ----------------------------------------------------
// Google Sheets Config
// ----------------------------------------------------
export function getGoogleSheetsConfig(): GoogleSheetsConfig | null {
  return safeGet<GoogleSheetsConfig | null>(STORAGE_KEYS.SHEETS_CONFIG, null);
}

export function saveGoogleSheetsConfig(config: GoogleSheetsConfig | null): void {
  safeSet(STORAGE_KEYS.SHEETS_CONFIG, config);
}

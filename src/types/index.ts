export type QuoteStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'vencida' | 'facturada';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'prefix' | 'suffix';
  decimals: number;
}

export interface BankInfo {
  bankName: string;
  accountType: string;
  accountNumber: string;
  beneficiaryName: string;
  beneficiaryTaxId: string;
  notifyEmail: string;
  notes?: string;
}

export interface DigitalWalletAccount {
  enabled: boolean;
  phone: string;
  holderName: string;
  qrCodeUrl?: string;
}

export interface CustomDigitalWallet {
  id: string;
  name: string; // ej: Mercado Pago, Zelle, Bizum, PayPal, etc.
  identifier: string; // teléfono, email o alias
  holderName: string;
  qrCodeUrl?: string;
  enabled: boolean;
}

export interface DigitalWalletsConfig {
  yape: DigitalWalletAccount;
  plin: DigitalWalletAccount;
  otherWallets: CustomDigitalWallet[];
}

export interface CompanyProfile {
  id: string;
  name: string; // Nombre comercial
  legalName: string; // Razón Social
  taxIdLabel: string; // Tipo de Razón/Identificación tributaria: RUC, RUS, RUT, RFC, NIT, CIF, CUIT, etc.
  taxId: string; // Número de identificación fiscal
  activity: string; // Giro comercial o Rubro
  logoUrl: string; // Data URL or Image URL
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  currency: CurrencyConfig;
  defaultTaxRate: number; // Porcentaje de IVA/impuesto (ej: 18, 19 o 16)
  defaultPricesIncludeTax?: boolean; // Si por defecto los precios ya incluyen impuesto
  taxName?: string; // Nombre del impuesto: IGV, IVA, VAT, etc.
  bankInfo: BankInfo;
  digitalWallets: DigitalWalletsConfig;
  quotePrefix: string;
  nextQuoteNumber: number;
  defaultPaymentTerms: string;
  defaultDeliveryTime: string;
  defaultValidityDays: number;
  defaultTerms: string;
  defaultNotes: string;
  signatoryName: string;
  signatoryTitle: string;
  signatorySignatureUrl?: string;
}

export interface Client {
  id: string;
  name: string; // Razón Social o Nombre Completo
  taxIdLabel?: string; // RUC, RUS, RUT, etc.
  taxId: string; // Identificación Fiscal
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string; // SKU o Código interno
  name: string;
  description: string;
  category: string;
  unit: string; // Unid, Horas, Servicios, Metros, Kg, etc.
  unitPrice: number;
  unitCost?: number;
  taxRate: number; // Porcentaje IVA
  imageUrl?: string; // Imagen referencial del producto o servicio
  isActive: boolean;
}

export interface QuoteItem {
  id: string;
  productId?: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  imageUrl?: string; // Imagen referencial copiada del producto o cargada
}

export type QuoteTheme = 'corporate' | 'slate' | 'emerald' | 'minimal';

export interface PaymentMethodsDisplayConfig {
  showBankTransfer: boolean;
  showYape: boolean;
  showPlin: boolean;
  showCustomWallets: boolean;
  showCash?: boolean; // Efectivo / Pago contra entrega
  showCard?: boolean; // Tarjeta de Crédito/Débito / Link de pago
  showCredit?: boolean; // Crédito Comercial Directo
  isExclusiveOffer?: boolean; // Marcar como condición o método de pago exclusivo para el cliente
  exclusiveTitle?: string; // Título de la condición exclusiva (ej. "Cliente Preferencial - Pago a 30 días")
  exclusiveNote?: string; // Detalle o instrucción del acuerdo exclusivo para este cliente
}

export interface Quote {
  id: string;
  folio: string;
  issueDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  clientId: string;
  clientSnapshot: Client;
  companySnapshot: CompanyProfile;
  items: QuoteItem[];
  currency: CurrencyConfig;
  subtotalGross: number;
  discountTotal: number;
  subtotalNet: number;
  taxTotal: number;
  total: number;
  status: QuoteStatus;
  paymentTerms: string;
  deliveryTime: string;
  validityDays: number;
  termsAndConditions: string;
  notes: string;
  templateTheme: QuoteTheme;
  pricesIncludeTax: boolean; // Indica si los precios de la cotización ya tienen impuesto incluido
  taxName?: string; // Nombre del impuesto: IGV, IVA, etc.
  showProductImages?: boolean; // Mostrar miniaturas en la cotización impresa
  paymentMethodsConfig?: PaymentMethodsDisplayConfig;
  createdAt: string;
  updatedAt: string;
}

export interface TermsTemplate {
  id: string;
  name: string;
  sector: string;
  paymentTerms: string;
  deliveryTime: string;
  validityDays: number;
  terms: string;
  notes: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  lastSyncedAt?: string;
  autoSyncOnSave?: boolean;
}

export interface RucAuthSession {
  ruc: string;
  businessName: string;
  userName: string;
  role: 'admin' | 'ventas';
  loginAt: string;
  rememberMe: boolean;
}

export interface SecurityConfig {
  requireRucLogin: boolean;
  accessPin: string;
  accessRuc?: string;
  allowQuickPin?: boolean;
}

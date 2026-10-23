import { Quote, Client, Product, QuoteItem, CompanyProfile, QuoteStatus } from '../types';
import * as XLSX from 'xlsx';
import { parseAnyDateToISO, computeValidUntilDate } from './dateUtils';

export const SHEET_NAMES = {
  QUOTES: 'Cotizaciones',
  ITEMS: 'Items Cotizados',
  CLIENTS: 'Clientes',
  PRODUCTS: 'Catálogo de Productos',
};

export const QUOTE_HEADERS = [
  'Folio',
  'Fecha Emisión',
  'Válido Hasta',
  'Estado',
  'Cliente',
  'Tipo ID Fiscal',
  'ID Fiscal / RUC',
  'Contacto',
  'Teléfono',
  'Email',
  'Moneda',
  'Modalidad Impuesto',
  'Subtotal Bruto',
  'Descuento Total',
  'Subtotal Neto',
  'Impuesto (IVA/IGV)',
  'Total General',
  'Condición de Pago',
  'Acuerdo Exclusivo Cliente',
  'Tiempo de Entrega',
  'Días Validez',
  'Cant. Ítems',
  'Resumen Productos',
  'Notas',
  'Fecha Registro',
];

export const ITEM_HEADERS = [
  'Folio Cotización',
  'Fecha Cotización',
  'Cliente',
  'Código SKU',
  'Producto / Servicio',
  'Unidad',
  'Cantidad',
  'Precio Unitario',
  '% Descuento',
  'Subtotal',
  'Impuesto / IVA',
  'Total Ítem',
  'Moneda',
];

export const CLIENT_HEADERS = [
  'Razón Social / Nombre',
  'Tipo Identificación',
  'Número Identificación',
  'Persona Contacto',
  'Email',
  'Teléfono',
  'Dirección',
  'Ciudad',
  'País',
  'Notas',
  'Fecha Registro',
];

export const PRODUCT_HEADERS = [
  'Código SKU',
  'Nombre del Producto / Servicio',
  'Descripción',
  'Categoría',
  'Unidad de Medida',
  'Precio Unitario',
  'Costo Unitario',
  '% Impuesto / IVA',
  'Estado',
  'URL Imagen',
];

/**
 * Extracts a spreadsheet ID from a raw ID or full Google Sheets URL
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Convert Quote object to row array for Google Sheets
 */
export function quoteToRow(quote: Quote): (string | number)[] {
  const cli = quote.clientSnapshot;
  const itemsSummary = (quote.items || [])
    .map((it) => `${it.quantity}x ${it.name}`)
    .join('; ');

  const paymentCfg = quote.paymentMethodsConfig;
  const paymentCondition = quote.paymentTerms || 'Contado';
  const exclusiveAgreement = paymentCfg?.isExclusiveOffer
    ? `Sí: ${paymentCfg.exclusiveTitle || 'Condición Exclusiva'} (${paymentCfg.exclusiveNote || ''})`
    : 'No (Condición estándar)';

  const taxMode = quote.pricesIncludeTax
    ? `Precios INCLUYEN ${quote.taxName || 'Impuesto'}`
    : `Precios MÁS ${quote.taxName || 'Impuesto'}`;

  return [
    quote.folio,
    parseAnyDateToISO(quote.issueDate) || '',
    parseAnyDateToISO(quote.validUntil) || '',
    (quote.status || 'borrador').toUpperCase(),
    cli?.name || 'Cliente sin asignar',
    cli?.taxIdLabel || 'RUC',
    cli?.taxId || '',
    cli?.contactPerson || '',
    cli?.phone || '',
    cli?.email || '',
    quote.currency?.code || 'USD',
    taxMode,
    quote.subtotalGross ?? 0,
    quote.discountTotal ?? 0,
    quote.subtotalNet ?? 0,
    quote.taxTotal ?? 0,
    quote.total ?? 0,
    paymentCondition,
    exclusiveAgreement,
    quote.deliveryTime || '',
    quote.validityDays || 0,
    quote.items?.length || 0,
    itemsSummary,
    quote.notes || '',
    quote.createdAt ? quote.createdAt.split('T')[0] : '',
  ];
}

/**
 * Convert Quote items to rows array for Google Sheets
 */
export function quoteItemsToRows(quote: Quote): (string | number)[][] {
  const cli = quote.clientSnapshot;
  return (quote.items || []).map((it) => [
    quote.folio,
    quote.issueDate || '',
    cli?.name || '',
    it.code || '',
    it.name || '',
    it.unit || 'Unid',
    it.quantity ?? 1,
    it.unitPrice ?? 0,
    it.discountPercent ?? 0,
    it.subtotal ?? 0,
    it.taxAmount ?? 0,
    it.total ?? 0,
    quote.currency?.code || 'USD',
  ]);
}

/**
 * Convert Client to row array
 */
export function clientToRow(client: Client): (string | number)[] {
  return [
    client.name || '',
    client.taxIdLabel || 'RUC',
    client.taxId || '',
    client.contactPerson || '',
    client.email || '',
    client.phone || '',
    client.address || '',
    client.city || '',
    client.country || '',
    client.notes || '',
    client.createdAt ? client.createdAt.split('T')[0] : '',
  ];
}

/**
 * Convert Product to row array
 */
export function productToRow(product: Product): (string | number)[] {
  return [
    product.code || '',
    product.name || '',
    product.description || '',
    product.category || 'General',
    product.unit || 'Unid',
    product.unitPrice ?? 0,
    product.unitCost ?? 0,
    product.taxRate ?? 0,
    product.isActive !== false ? 'Activo' : 'Inactivo',
    product.imageUrl || '',
  ];
}

/**
 * Fetch spreadsheet metadata to check access and sheets
 */
export async function getSpreadsheetInfo(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: string[]; url: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `No se pudo acceder a la hoja de cálculo (${res.status}): ${errorText}`
    );
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map(
    (s: any) => s?.properties?.title as string
  );
  return {
    title: data.properties?.title || 'Google Sheet',
    sheets,
    url: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
  };
}

/**
 * Create a brand new Google Spreadsheet configured with our 4 sheets
 */
export async function createQuotesSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ id: string; url: string; title: string }> {
  // 1. Create spreadsheet with 4 tabs
  const createPayload = {
    properties: {
      title: title || 'CotizaPro - Registro de Cotizaciones y Ventas',
    },
    sheets: [
      {
        properties: {
          title: SHEET_NAMES.QUOTES,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_NAMES.ITEMS,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_NAMES.CLIENTS,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: SHEET_NAMES.PRODUCTS,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al crear la hoja de cálculo (${res.status}): ${errText}`);
  }

  const sheetData = await res.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Initialize header rows for each tab
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'${SHEET_NAMES.QUOTES}'!A1:Y1`,
            values: [QUOTE_HEADERS],
          },
          {
            range: `'${SHEET_NAMES.ITEMS}'!A1:M1`,
            values: [ITEM_HEADERS],
          },
          {
            range: `'${SHEET_NAMES.CLIENTS}'!A1:K1`,
            values: [CLIENT_HEADERS],
          },
          {
            range: `'${SHEET_NAMES.PRODUCTS}'!A1:J1`,
            values: [PRODUCT_HEADERS],
          },
        ],
      }),
    }
  );

  // 3. Format header rows with bold styling & corporate background
  try {
    const sheetIds = sheetData.sheets.map((s: any) => s.properties.sheetId);
    const formatRequests = sheetIds.map((sheetId: number) => ({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.23, blue: 0.36 }, // dark corporate slate/navy
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatRequests }),
      }
    );
  } catch (err) {
    console.warn('Formatting batch update non-fatal error:', err);
  }

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    title: sheetData.properties?.title || title,
  };
}

/**
 * Check if the required sheet tabs exist, create them if missing
 */
export async function ensureSheetTabsExist(
  spreadsheetId: string,
  accessToken: string
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const info = await getSpreadsheetInfo(cleanId, accessToken);

  const missingTabs: string[] = [];
  if (!info.sheets.includes(SHEET_NAMES.QUOTES)) missingTabs.push(SHEET_NAMES.QUOTES);
  if (!info.sheets.includes(SHEET_NAMES.ITEMS)) missingTabs.push(SHEET_NAMES.ITEMS);
  if (!info.sheets.includes(SHEET_NAMES.CLIENTS)) missingTabs.push(SHEET_NAMES.CLIENTS);
  if (!info.sheets.includes(SHEET_NAMES.PRODUCTS)) missingTabs.push(SHEET_NAMES.PRODUCTS);

  if (missingTabs.length === 0) return;

  const requests = missingTabs.map((title) => ({
    addSheet: {
      properties: {
        title,
        gridProperties: { frozenRowCount: 1 },
      },
    },
  }));

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  // Add headers to newly added tabs
  const data: any[] = [];
  if (missingTabs.includes(SHEET_NAMES.QUOTES)) {
    data.push({ range: `'${SHEET_NAMES.QUOTES}'!A1:Y1`, values: [QUOTE_HEADERS] });
  }
  if (missingTabs.includes(SHEET_NAMES.ITEMS)) {
    data.push({ range: `'${SHEET_NAMES.ITEMS}'!A1:M1`, values: [ITEM_HEADERS] });
  }
  if (missingTabs.includes(SHEET_NAMES.CLIENTS)) {
    data.push({ range: `'${SHEET_NAMES.CLIENTS}'!A1:K1`, values: [CLIENT_HEADERS] });
  }
  if (missingTabs.includes(SHEET_NAMES.PRODUCTS)) {
    data.push({ range: `'${SHEET_NAMES.PRODUCTS}'!A1:J1`, values: [PRODUCT_HEADERS] });
  }

  if (data.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data,
        }),
      }
    );
  }
}

/**
 * Save / Update a single quote in Google Sheets
 */
export async function saveQuoteToSpreadsheet(
  spreadsheetId: string,
  quote: Quote,
  accessToken: string
): Promise<{ updated: boolean; rowNumber?: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  await ensureSheetTabsExist(cleanId, accessToken);

  // 1. Check if folio already exists in Cotizaciones sheet
  const foliosRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
      SHEET_NAMES.QUOTES
    )}'!A:A`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let existingRow = -1;
  if (foliosRes.ok) {
    const foliosData = await foliosRes.json();
    const rows: string[][] = foliosData.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === quote.folio) {
        existingRow = i + 1; // 1-indexed sheet row
        break;
      }
    }
  }

  const quoteRow = quoteToRow(quote);

  if (existingRow > 1) {
    // Update existing row
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
        SHEET_NAMES.QUOTES
      )}'!A${existingRow}:Y${existingRow}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [quoteRow],
        }),
      }
    );

    if (!updateRes.ok) {
      throw new Error(`Error al actualizar fila en Google Sheets: ${await updateRes.text()}`);
    }

    return { updated: true, rowNumber: existingRow };
  } else {
    // Append new row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
        SHEET_NAMES.QUOTES
      )}'!A:Y:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [quoteRow],
        }),
      }
    );

    if (!appendRes.ok) {
      throw new Error(`Error al agregar cotización a Google Sheets: ${await appendRes.text()}`);
    }

    // Also append line items if any
    const itemRows = quoteItemsToRows(quote);
    if (itemRows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
          SHEET_NAMES.ITEMS
        )}'!A:M:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: itemRows,
          }),
        }
      );
    }

    // If client snapshot exists, check and record in Clientes sheet
    if (quote.clientSnapshot) {
      try {
        await appendClientIfNotExists(cleanId, quote.clientSnapshot, accessToken);
      } catch (e) {
        console.warn('Non-fatal error appending client to sheet:', e);
      }
    }

    return { updated: false };
  }
}

/**
 * Append client if not already in Clientes sheet
 */
export async function appendClientIfNotExists(
  spreadsheetId: string,
  client: Client,
  accessToken: string
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const clientsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
      SHEET_NAMES.CLIENTS
    )}'!A:C`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (clientsRes.ok) {
    const data = await clientsRes.json();
    const rows: string[][] = data.values || [];
    const exists = rows.some(
      (r) =>
        (client.taxId && r[2] === client.taxId) ||
        (client.name && r[0]?.toLowerCase() === client.name.toLowerCase())
    );
    if (exists) return;
  }

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
      SHEET_NAMES.CLIENTS
    )}'!A:K:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [clientToRow(client)],
      }),
    }
  );
}

/**
 * Full synchronization of all quotes and clients into Google Sheets.
 * Overwrites data rows while preserving headers.
 */
export async function syncAllDataToSpreadsheet(
  spreadsheetId: string,
  quotes: Quote[],
  clients: Client[],
  products: Product[],
  accessToken: string
): Promise<{ quotesCount: number; itemsCount: number; clientsCount: number; productsCount: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  await ensureSheetTabsExist(cleanId, accessToken);

  // 1. Prepare all data rows
  const quoteRows = quotes.map((q) => quoteToRow(q));
  const allItemRows = quotes.flatMap((q) => quoteItemsToRows(q));
  const clientRows = clients.map((c) => clientToRow(c));
  const productRows = products.map((p) => productToRow(p));

  // 2. Clear previous content (preserving row 1 headers)
  await Promise.all([
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
        SHEET_NAMES.QUOTES
      )}'!A2:Y10000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ),
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
        SHEET_NAMES.ITEMS
      )}'!A2:M10000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ),
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
        SHEET_NAMES.CLIENTS
      )}'!A2:K10000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ),
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(
        SHEET_NAMES.PRODUCTS
      )}'!A2:J10000:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ),
  ]);

  // 3. Write new data batch
  const batchData: any[] = [
    {
      range: `'${SHEET_NAMES.QUOTES}'!A1:Y1`,
      values: [QUOTE_HEADERS],
    },
    {
      range: `'${SHEET_NAMES.ITEMS}'!A1:M1`,
      values: [ITEM_HEADERS],
    },
    {
      range: `'${SHEET_NAMES.CLIENTS}'!A1:K1`,
      values: [CLIENT_HEADERS],
    },
    {
      range: `'${SHEET_NAMES.PRODUCTS}'!A1:J1`,
      values: [PRODUCT_HEADERS],
    },
  ];

  if (quoteRows.length > 0) {
    batchData.push({
      range: `'${SHEET_NAMES.QUOTES}'!A2:Y${quoteRows.length + 1}`,
      values: quoteRows,
    });
  }

  if (allItemRows.length > 0) {
    batchData.push({
      range: `'${SHEET_NAMES.ITEMS}'!A2:M${allItemRows.length + 1}`,
      values: allItemRows,
    });
  }

  if (clientRows.length > 0) {
    batchData.push({
      range: `'${SHEET_NAMES.CLIENTS}'!A2:K${clientRows.length + 1}`,
      values: clientRows,
    });
  }

  if (productRows.length > 0) {
    batchData.push({
      range: `'${SHEET_NAMES.PRODUCTS}'!A2:J${productRows.length + 1}`,
      values: productRows,
    });
  }

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!writeRes.ok) {
    const errorMsg = await writeRes.text();
    throw new Error(`Error sincronizando en Google Sheets: ${errorMsg}`);
  }

  return {
    quotesCount: quoteRows.length,
    itemsCount: allItemRows.length,
    clientsCount: clientRows.length,
    productsCount: productRows.length,
  };
}

// ----------------------------------------------------
// RESTORE / IMPORT ENGINE (From Google Sheets & Excel)
// ----------------------------------------------------

/**
 * Robust numeric parser handling US (1,234.56), European (1.234,56), and currency prefixes/suffixes
 */
export function parseNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  let str = String(val).trim();
  // Strip currency symbols and whitespace
  str = str.replace(/[$\u20AC\u00A3S/PENCLPUSD\s]/gi, '').trim();
  if (!str) return fallback;

  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // European/Latin: 1.234,56 -> 1234.56
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard: 1,234.56 -> 1234.56
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse clients from 2D array of rows
 */
export function parseClientsFromRows(rows: any[][]): Client[] {
  if (!rows || rows.length === 0) return [];

  const clients: Client[] = [];
  const startIdx = rows[0] && String(rows[0][0] || '').toLowerCase().includes('raz') ? 1 : 0;

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const name = String(r[0] || '').trim();
    const taxId = String(r[2] || '').trim();
    if (!name && !taxId) continue;

    const taxIdLabel = String(r[1] || 'RUC').trim() || 'RUC';
    const contactPerson = String(r[3] || '').trim();
    const email = String(r[4] || '').trim();
    const phone = String(r[5] || '').trim();
    const address = String(r[6] || '').trim();
    const city = String(r[7] || '').trim();
    const country = String(r[8] || '').trim();
    const notes = String(r[9] || '').trim();
    const createdAt = String(r[10] || '').trim() || new Date().toISOString();

    clients.push({
      id: `client-${Date.now()}-${i}`,
      name: name || `Cliente ${taxId}`,
      taxIdLabel,
      taxId,
      contactPerson,
      email,
      phone,
      address,
      city,
      country,
      notes: notes || undefined,
      createdAt,
    });
  }

  return clients;
}

/**
 * Parse products from 2D array of rows
 */
export function parseProductsFromRows(rows: any[][]): Product[] {
  if (!rows || rows.length === 0) return [];

  const products: Product[] = [];
  const startIdx = rows[0] && (String(rows[0][0] || '').toLowerCase().includes('sku') || String(rows[0][1] || '').toLowerCase().includes('nombre')) ? 1 : 0;

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const code = String(r[0] || '').trim();
    const name = String(r[1] || '').trim();
    if (!name && !code) continue;

    const description = String(r[2] || '').trim();
    const category = String(r[3] || 'General').trim() || 'General';
    const unit = String(r[4] || 'Unid').trim() || 'Unid';
    const unitPrice = parseNumber(r[5], 0);
    const unitCost = parseNumber(r[6], 0);
    const taxRate = parseNumber(r[7], 18);
    const statusStr = String(r[8] || 'Activo').toLowerCase();
    const isActive = !statusStr.includes('inact');
    const imageUrl = String(r[9] || '').trim() || undefined;

    products.push({
      id: `prod-${Date.now()}-${i}`,
      code: code || `SKU-${1000 + i}`,
      name: name || `Producto ${code}`,
      description,
      category,
      unit,
      unitPrice,
      unitCost: unitCost || undefined,
      taxRate,
      isActive,
      imageUrl,
    });
  }

  return products;
}

/**
 * Parse items and group by Quote Folio
 */
export function parseItemsFromRows(rows: any[][]): Map<string, QuoteItem[]> {
  const map = new Map<string, QuoteItem[]>();
  if (!rows || rows.length === 0) return map;

  const startIdx = rows[0] && (String(rows[0][0] || '').toLowerCase().includes('folio') || String(rows[0][4] || '').toLowerCase().includes('producto')) ? 1 : 0;

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const folio = String(r[0] || '').trim();
    if (!folio) continue;

    const code = String(r[3] || '').trim();
    const name = String(r[4] || '').trim() || 'Ítem de Cotización';
    const unit = String(r[5] || 'Unid').trim() || 'Unid';
    const quantity = parseNumber(r[6], 1);
    const unitPrice = parseNumber(r[7], 0);
    const discountPercent = parseNumber(r[8], 0);
    const subtotal = parseNumber(r[9], quantity * unitPrice);
    const taxAmount = parseNumber(r[10], 0);
    const total = parseNumber(r[11], subtotal + taxAmount);

    const item: QuoteItem = {
      id: `item-${Date.now()}-${i}`,
      code,
      name,
      description: '',
      unit,
      quantity,
      unitPrice,
      discountPercent,
      taxRate: subtotal > 0 && taxAmount > 0 ? Math.round((taxAmount / subtotal) * 100) : 18,
      subtotal,
      taxAmount,
      total,
    };

    const existing = map.get(folio) || [];
    existing.push(item);
    map.set(folio, existing);
  }

  return map;
}

/**
 * Parse quotes from rows with matched items and clients
 */
export function parseQuotesFromRows(
  quoteRows: any[][],
  itemsMap: Map<string, QuoteItem[]>,
  clients: Client[],
  products: Product[],
  defaultCompany: CompanyProfile
): Quote[] {
  if (!quoteRows || quoteRows.length === 0) return [];

  const quotes: Quote[] = [];
  const startIdx = quoteRows[0] && String(quoteRows[0][0] || '').toLowerCase().includes('folio') ? 1 : 0;

  for (let i = startIdx; i < quoteRows.length; i++) {
    const r = quoteRows[i];
    if (!r || r.length === 0) continue;
    const folio = String(r[0] || '').trim();
    if (!folio) continue;

    const issueDate = parseAnyDateToISO(r[1], new Date().toISOString().split('T')[0]);
    const validUntil = parseAnyDateToISO(r[2], computeValidUntilDate(issueDate, 15));
    const rawStatus = String(r[3] || 'borrador').toLowerCase().trim();
    let status: QuoteStatus = 'borrador';
    if (rawStatus.includes('env')) status = 'enviada';
    else if (rawStatus.includes('apr')) status = 'aprobada';
    else if (rawStatus.includes('rech')) status = 'rechazada';
    else if (rawStatus.includes('venc')) status = 'vencida';
    else if (rawStatus.includes('fact')) status = 'facturada';

    const clientName = String(r[4] || '').trim();
    const taxIdLabel = String(r[5] || 'RUC').trim();
    const taxId = String(r[6] || '').trim();
    const contactPerson = String(r[7] || '').trim();
    const phone = String(r[8] || '').trim();
    const email = String(r[9] || '').trim();

    // Match client or create snapshot
    let matchedClient = clients.find(
      (c) => (taxId && c.taxId === taxId) || (clientName && c.name.toLowerCase() === clientName.toLowerCase())
    );

    if (!matchedClient) {
      matchedClient = {
        id: `client-snap-${Date.now()}-${i}`,
        name: clientName || 'Cliente sin asignar',
        taxIdLabel: taxIdLabel || 'RUC',
        taxId,
        contactPerson,
        email,
        phone,
        address: '',
        city: '',
        country: defaultCompany.country || 'Perú',
        createdAt: issueDate,
      };
    }

    const currencyCode = String(r[10] || defaultCompany.currency?.code || 'USD').trim();
    const taxMode = String(r[11] || '').toLowerCase();
    const pricesIncludeTax = taxMode.includes('incluyen');

    const subtotalGross = parseNumber(r[12], 0);
    const discountTotal = parseNumber(r[13], 0);
    const subtotalNet = parseNumber(r[14], subtotalGross - discountTotal);
    const taxTotal = parseNumber(r[15], 0);
    const total = parseNumber(r[16], subtotalNet + taxTotal);

    const paymentTerms = String(r[17] || defaultCompany.defaultPaymentTerms || 'Contado').trim();
    const exclusiveAgreementRaw = String(r[18] || '').trim();
    const isExclusiveOffer = exclusiveAgreementRaw.toLowerCase().startsWith('sí') || exclusiveAgreementRaw.toLowerCase().startsWith('si');
    let exclusiveTitle = '';
    let exclusiveNote = '';
    if (isExclusiveOffer) {
      const match = exclusiveAgreementRaw.match(/Sí:\s*(.*?)\s*\((.*?)\)/i);
      if (match) {
        exclusiveTitle = match[1] || 'Condición Exclusiva';
        exclusiveNote = match[2] || '';
      } else {
        exclusiveTitle = 'Condición Exclusiva';
        exclusiveNote = exclusiveAgreementRaw.replace(/^sí:\s*/i, '');
      }
    }

    const deliveryTime = String(r[19] || defaultCompany.defaultDeliveryTime || 'Inmediata').trim();
    const validityDays = Math.round(parseNumber(r[20], defaultCompany.defaultValidityDays || 15));
    const itemsSummary = String(r[22] || '').trim();
    const notes = String(r[23] || '').trim();
    const createdAt = String(r[24] || '').trim() || `${issueDate}T12:00:00.000Z`;

    // Match quote items or synthesize
    let items = itemsMap.get(folio) || [];
    if (items.length === 0) {
      if (itemsSummary) {
        // Parse items from summary e.g. "2x Laptop; 1x Monitor"
        const parts = itemsSummary.split(';').map((p) => p.trim()).filter(Boolean);
        items = parts.map((part, pIdx) => {
          const qMatch = part.match(/^(\d+(?:\.\d+)?)\s*x\s*(.*)$/i);
          const qty = qMatch ? parseNumber(qMatch[1], 1) : 1;
          const name = qMatch ? qMatch[2] : part;
          const unitPrice = total > 0 && parts.length > 0 ? (total / parts.length) / qty : 0;
          return {
            id: `item-gen-${folio}-${pIdx}`,
            code: `SKU-${100 + pIdx}`,
            name,
            description: '',
            unit: 'Unid',
            quantity: qty,
            unitPrice,
            discountPercent: 0,
            taxRate: 18,
            subtotal: qty * unitPrice,
            taxAmount: 0,
            total: qty * unitPrice,
          };
        });
      } else {
        // Generic fallback item so quote document functions
        items = [
          {
            id: `item-gen-${folio}-0`,
            code: 'PART-01',
            name: `Servicio / Producto según cotización ${folio}`,
            description: '',
            unit: 'Servicio',
            quantity: 1,
            unitPrice: subtotalNet || total,
            discountPercent: 0,
            taxRate: subtotalNet > 0 && taxTotal > 0 ? Math.round((taxTotal / subtotalNet) * 100) : 18,
            subtotal: subtotalNet || total,
            taxAmount: taxTotal,
            total: total || subtotalNet,
          },
        ];
      }
    }

    // Try linking product imageUrl to items if available
    items = items.map((it) => {
      if (!it.imageUrl && products.length > 0) {
        const prod = products.find(
          (p) => (it.code && p.code.toLowerCase() === it.code.toLowerCase()) || p.name.toLowerCase() === it.name.toLowerCase()
        );
        if (prod?.imageUrl) {
          return { ...it, imageUrl: prod.imageUrl, productId: prod.id };
        }
      }
      return it;
    });

    quotes.push({
      id: `quote-${folio.replace(/[^a-zA-Z0-9]/g, '-')}`,
      folio,
      issueDate,
      validUntil,
      clientId: matchedClient.id,
      clientSnapshot: matchedClient,
      companySnapshot: defaultCompany,
      items,
      currency: {
        code: currencyCode,
        symbol: currencyCode === 'PEN' ? 'S/' : currencyCode === 'EUR' ? '€' : currencyCode === 'CLP' ? '$' : '$',
        position: currencyCode === 'EUR' ? 'suffix' : 'prefix',
        decimals: currencyCode === 'CLP' ? 0 : 2,
      },
      subtotalGross,
      discountTotal,
      subtotalNet,
      taxTotal,
      total,
      status,
      paymentTerms,
      deliveryTime,
      validityDays,
      termsAndConditions: defaultCompany.defaultTerms || '',
      notes,
      templateTheme: 'corporate',
      pricesIncludeTax,
      taxName: defaultCompany.taxName || 'IGV',
      showProductImages: true,
      paymentMethodsConfig: {
        showBankTransfer: true,
        showYape: true,
        showPlin: true,
        showCustomWallets: true,
        isExclusiveOffer,
        exclusiveTitle: isExclusiveOffer ? exclusiveTitle : undefined,
        exclusiveNote: isExclusiveOffer ? exclusiveNote : undefined,
      },
      createdAt,
      updatedAt: createdAt,
    });
  }

  return quotes;
}

/**
 * Fetch all 4 sheets from Google Sheets API and parse them into CotizaPro datasets
 */
export async function restoreFromGoogleSheets(
  spreadsheetId: string,
  accessToken: string,
  company: CompanyProfile
): Promise<{
  quotes: Quote[];
  clients: Client[];
  products: Product[];
  stats: { quotes: number; items: number; clients: number; products: number };
}> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const info = await getSpreadsheetInfo(cleanId, accessToken);

  // Match sheet titles case-insensitively
  const findTab = (name: string) => {
    return (
      info.sheets.find((s) => s.toLowerCase() === name.toLowerCase()) ||
      info.sheets.find((s) => s.toLowerCase().includes(name.toLowerCase()))
    );
  };

  const quotesTab = findTab(SHEET_NAMES.QUOTES) || findTab('Cotiz') || info.sheets[0];
  const itemsTab = findTab(SHEET_NAMES.ITEMS) || findTab('Items') || findTab('Partidas');
  const clientsTab = findTab(SHEET_NAMES.CLIENTS) || findTab('Client');
  const productsTab = findTab(SHEET_NAMES.PRODUCTS) || findTab('Product') || findTab('Cat');

  const rangesToFetch: string[] = [];
  if (quotesTab) rangesToFetch.push(`'${quotesTab}'!A1:Z10000`);
  if (itemsTab) rangesToFetch.push(`'${itemsTab}'!A1:N10000`);
  if (clientsTab) rangesToFetch.push(`'${clientsTab}'!A1:L10000`);
  if (productsTab) rangesToFetch.push(`'${productsTab}'!A1:K10000`);

  if (rangesToFetch.length === 0) {
    throw new Error('No se encontraron pestañas reconocibles en la hoja de cálculo de Google.');
  }

  const queryUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangesToFetch
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const res = await fetch(queryUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorMsg = await res.text();
    throw new Error(`Error al leer los datos desde Google Sheets (${res.status}): ${errorMsg}`);
  }

  const batchData = await res.json();
  const valueRanges = batchData.valueRanges || [];

  let quotesRows: any[][] = [];
  let itemsRows: any[][] = [];
  let clientsRows: any[][] = [];
  let productsRows: any[][] = [];

  valueRanges.forEach((vr: any) => {
    const rangeName = vr.range || '';
    if (quotesTab && rangeName.includes(quotesTab)) {
      quotesRows = vr.values || [];
    } else if (itemsTab && rangeName.includes(itemsTab)) {
      itemsRows = vr.values || [];
    } else if (clientsTab && rangeName.includes(clientsTab)) {
      clientsRows = vr.values || [];
    } else if (productsTab && rangeName.includes(productsTab)) {
      productsRows = vr.values || [];
    }
  });

  const clients = parseClientsFromRows(clientsRows);
  const products = parseProductsFromRows(productsRows);
  const itemsMap = parseItemsFromRows(itemsRows);
  const quotes = parseQuotesFromRows(quotesRows, itemsMap, clients, products, company);

  let totalItemsCount = 0;
  itemsMap.forEach((its) => (totalItemsCount += its.length));

  return {
    quotes,
    clients,
    products,
    stats: {
      quotes: quotes.length,
      items: totalItemsCount,
      clients: clients.length,
      products: products.length,
    },
  };
}

/**
 * Parse an Excel (.xlsx / .xls) workbook ArrayBuffer into CotizaPro datasets
 */
export function parseExcelWorkbook(
  buffer: ArrayBuffer,
  company: CompanyProfile
): {
  quotes: Quote[];
  clients: Client[];
  products: Product[];
  stats: { quotes: number; items: number; clients: number; products: number };
} {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene ninguna hoja de trabajo.');
  }

  const findSheet = (pattern: string) => {
    return (
      sheetNames.find((s) => s.toLowerCase() === pattern.toLowerCase()) ||
      sheetNames.find((s) => s.toLowerCase().includes(pattern.toLowerCase()))
    );
  };

  const quotesSheetName = findSheet('Cotizaciones') || findSheet('Quotes') || findSheet('Cotiz') || sheetNames[0];
  const itemsSheetName = findSheet('Items') || findSheet('Partidas') || findSheet('Detalle');
  const clientsSheetName = findSheet('Clientes') || findSheet('Clients');
  const productsSheetName = findSheet('Productos') || findSheet('Catálogo') || findSheet('Products');

  const sheetTo2D = (name?: string): any[][] => {
    if (!name || !workbook.Sheets[name]) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }) as any[][];
  };

  const quotesRows = sheetTo2D(quotesSheetName);
  const itemsRows = sheetTo2D(itemsSheetName);
  const clientsRows = sheetTo2D(clientsSheetName);
  const productsRows = sheetTo2D(productsSheetName);

  const clients = parseClientsFromRows(clientsRows);
  const products = parseProductsFromRows(productsRows);
  const itemsMap = parseItemsFromRows(itemsRows);
  const quotes = parseQuotesFromRows(quotesRows, itemsMap, clients, products, company);

  let totalItemsCount = 0;
  itemsMap.forEach((its) => (totalItemsCount += its.length));

  return {
    quotes,
    clients,
    products,
    stats: {
      quotes: quotes.length,
      items: totalItemsCount,
      clients: clients.length,
      products: products.length,
    },
  };
}

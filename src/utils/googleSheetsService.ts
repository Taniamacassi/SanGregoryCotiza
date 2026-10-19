import { Quote, Client, Product } from '../types';

export const SHEET_NAMES = {
  QUOTES: 'Cotizaciones',
  ITEMS: 'Items Cotizados',
  CLIENTS: 'Clientes',
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
    quote.issueDate || '',
    quote.validUntil || '',
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
 * Create a brand new Google Spreadsheet configured with our 3 sheets
 */
export async function createQuotesSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ id: string; url: string; title: string }> {
  // 1. Create spreadsheet with 3 tabs
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
  accessToken: string
): Promise<{ quotesCount: number; itemsCount: number; clientsCount: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  await ensureSheetTabsExist(cleanId, accessToken);

  // 1. Prepare all quote rows
  const quoteRows = quotes.map((q) => quoteToRow(q));
  const allItemRows = quotes.flatMap((q) => quoteItemsToRows(q));
  const clientRows = clients.map((c) => clientToRow(c));

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
  };
}

/**
 * Converts a number into Spanish words for invoices and quotes
 * Example: 2500 -> "DOS MIL QUINIENTOS"
 */
export function numberToSpanishWords(num: number): string {
  if (isNaN(num)) return 'CERO';
  
  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  if (integerPart === 0) {
    return `CERO CON ${decimalPart.toString().padStart(2, '0')}/100`;
  }

  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertGroup(n: number): string {
    let output = '';

    if (n === 100) return 'CIEN';

    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) {
      output += hundreds[h] + ' ';
    }

    if (t === 1) {
      output += teens[u] + ' ';
    } else if (t === 2 && u > 0) {
      const veinti = ['VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
      output += veinti[u - 1] + ' ';
    } else {
      if (t > 0) {
        output += tens[t];
        if (u > 0) output += ' Y ';
        else output += ' ';
      }
      if (u > 0 && t !== 1) {
        output += units[u] + ' ';
      }
    }

    return output.trim();
  }

  function convertFull(n: number): string {
    if (n === 0) return 'CERO';

    let result = '';

    // Billions (Millardos)
    const billions = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;

    if (billions > 0) {
      if (billions === 1) result += 'MIL MILLONES ';
      else result += convertGroup(billions) + ' MIL MILLONES ';
    }

    if (millions > 0) {
      if (millions === 1) result += 'UN MILLÓN ';
      else result += convertGroup(millions) + ' MILLONES ';
    }

    if (thousands > 0) {
      if (thousands === 1) result += 'MIL ';
      else result += convertGroup(thousands) + ' MIL ';
    }

    if (remainder > 0) {
      result += convertGroup(remainder);
    }

    return result.trim();
  }

  const words = convertFull(integerPart);
  return `${words} CON ${decimalPart.toString().padStart(2, '0')}/100`;
}

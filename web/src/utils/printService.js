// Central print helper for the POS.
// In the desktop (.exe) app, window.zaiqaPrint is injected by preload.js and we
// silent-print to the printer the user assigned in Settings (no dialog).
// In a plain browser, we fall back to window.print() (dialog shows).

const PRINTER_PREF_KEY = 'zaiqa_printer_settings';

export function isDesktopPrint() {
  return typeof window !== 'undefined' && !!window.zaiqaPrint && window.zaiqaPrint.isDesktop;
}

// { billPrinter: string, kotPrinter: string }
export function getPrinterSettings() {
  try {
    return JSON.parse(localStorage.getItem(PRINTER_PREF_KEY) || '{}');
  } catch {
    return {};
  }
}

export function savePrinterSettings(settings) {
  localStorage.setItem(PRINTER_PREF_KEY, JSON.stringify(settings || {}));
}

export async function listPrinters() {
  if (!isDesktopPrint()) return [];
  try {
    return await window.zaiqaPrint.getPrinters();
  } catch {
    return [];
  }
}

// Build a full standalone HTML doc from the off-screen receipt node's HTML,
// carrying over the page's styles so the thermal layout matches the preview.
function buildPrintHtml(innerHtml) {
  const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${headStyles}
    <style>
      @page { margin: 0; size: 80mm auto; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body > div { margin: 0 auto; width: 100%; max-width: 72mm; box-sizing: border-box; }
    </style>
  </head><body>${innerHtml}</body></html>`;
}

/**
 * Print a receipt.
 * @param {'bill'|'kot'} type - which assigned printer to use
 * @param {HTMLElement} node - the rendered receipt DOM node (off-screen wrapper)
 * @param {number} copies
 * @returns {Promise<boolean>} true if silent-printed, false if it fell back / failed
 */
export async function printReceipt(type, node, copies = 1) {
  // Browser (no desktop bridge): use the normal dialog print.
  if (!isDesktopPrint()) {
    window.print();
    return false;
  }

  const settings = getPrinterSettings();
  const deviceName = type === 'kot' ? settings.kotPrinter : settings.billPrinter;

  // No printer configured yet — fall back to dialog so nothing is lost.
  if (!deviceName) {
    window.print();
    return false;
  }

  const innerHtml = node ? node.innerHTML : '';
  const html = buildPrintHtml(innerHtml);

  try {
    const res = await window.zaiqaPrint.silentPrint({ html, deviceName, copies });
    if (!res || !res.ok) {
      // Silent print failed (printer offline etc.) — fall back to dialog.
      window.print();
      return false;
    }
    return true;
  } catch {
    window.print();
    return false;
  }
}

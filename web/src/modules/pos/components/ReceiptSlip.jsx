import React from 'react';
import Logo from '../../../assets/ziqahh.png';

const ReceiptSlip = ({ printData, isPreview = false }) => {
  if (!printData) return null;

  const {
    items,
    subtotal,
    tax,
    total,
    orderId,
    date,
    table,
    customerName,
    customerPhone,
    deliveryAddress,
    paymentMethod,
    transactionId,
    remarks,
    riderName,
    serviceCharges,
    invoiceNumber,
    invoice_number,
    paymentStatus,
    payment_status,
    isEstimate,
    isKOT,
    reprintLabel,
    printCount,
    kotStatus,
    kotReason
  } = printData;

  const currentPaymentStatus = paymentStatus || payment_status || 'NONE';

  const invNum = (() => {
    if (invoiceNumber && !invoiceNumber.match(/^INV-\d+$/)) return invoiceNumber;
    if (invoice_number && !invoice_number.match(/^INV-\d+$/)) return invoice_number;
    const d = date ? new Date(date) : new Date();
    const dateStr = d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    const stableSuffix = (() => {
      const s = String(orderId || '0');
      if (s.startsWith('DEL-')) {
        return s.replace('DEL-', '');
      }
      return s.padStart(4, '0');
    })();
    return `INV-${dateStr}-${stableSuffix}`;
  })();

  const displayItems = (items || []).filter(item => item.name !== 'Service Charges' && item.item_name !== 'Service Charges');

  const serviceChargesAmt = serviceCharges !== undefined
    ? Number(serviceCharges)
    : (items || []).find(item => item.name === 'Service Charges' || item.item_name === 'Service Charges')?.price || 0;

  const formatDate = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    return d.toLocaleString('en-PK', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const wrap = {
    width: '100%',
    maxWidth: '270px',
    margin: '0 auto',
    background: '#ffffff',
    color: '#000000',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '12px',
    lineHeight: '1.3',
    padding: isPreview ? '1mm 4mm 15mm 4mm' : '1mm 4mm 15mm 0.5mm',
    boxSizing: 'border-box',
    position: 'relative',
  };

  const center = { textAlign: 'center' };
  const dash = { borderTop: '1px dashed #000', margin: '2mm 0' };
  const solid = { borderTop: '1px solid #000', margin: '1mm 0' };
  const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', fontSize: '12px', color: '#000' };

  if (isKOT) {
    const kotDash = { borderTop: '1px dashed #000', margin: '1mm 0' };
    const kotSolid = { borderTop: '1px solid #000', margin: '0.5mm 0' };
    return (
      <div style={{ ...wrap, padding: isPreview ? '1mm 4mm 15mm 4mm' : '1mm 4mm 15mm 0.5mm' }}>
        <div style={{
          textAlign: 'center',
          fontWeight: 'black',
          fontSize: '15px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '1.5mm',
          borderBottom: '1px solid #000',
          paddingBottom: '0.5mm'
        }}>
          * KITCHEN COPY *
        </div>

        {reprintLabel && (
          <div style={{
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '1.5mm',
            border: '1px dashed #000',
            padding: '1mm',
          }}>
            {reprintLabel}
          </div>
        )}

        <div style={{ ...row, marginBottom: '0.5mm', fontSize: '11px' }}>
          <span>ORDER: <strong>#{orderId || 'PENDING'}</strong></span>
          <span>TOKEN: <strong style={{ fontSize: '14px' }}>{orderId || 'PENDING'}</strong></span>
        </div>

        <div style={{ ...row, marginBottom: '0.5mm', fontSize: '11px' }}>
          <span>TABLE: <strong>{table ? (typeof table === 'object' ? `${table.area} - ${table.number}` : table) : 'N/A'}</strong></span>
          <span>{formatDate(date)}</span>
        </div>

        {printCount && (
          <div style={{ ...row, marginBottom: '0.5mm', fontSize: '11px', color: '#000', fontWeight: 'bold' }}>
            <span>PRINT COPY: <strong>{printCount > 1 ? `REPRINT #${printCount}` : `ORIGINAL #${printCount}`}</strong></span>
            {kotStatus && kotStatus === 'failed' && (
              <span style={{ color: '#dc2626' }}>⚠️ PREVIOUS FAILED ({kotReason || 'Unknown'})</span>
            )}
          </div>
        )}

        <div style={kotDash} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '0.5mm', color: '#000' }}>
          <span style={{ width: '40px' }}>QTY</span>
          <span style={{ flex: 1 }}>ITEM</span>
        </div>
        <div style={kotSolid} />

        <div style={{ marginBottom: '0.5mm' }}>
          {displayItems.map((item, index) => (
            <div key={index} style={{ marginBottom: '2mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#000', fontWeight: 'bold' }}>
                <span style={{ width: '40px', fontWeight: 'black', fontSize: '16px' }}>{item.qty}x</span>
                <span style={{ flex: 1, paddingRight: '3px', fontWeight: 'bold' }}>{item.name || item.item_name}</span>
              </div>
              {item.notes && (
                <div style={{ fontSize: '11px', color: '#000', paddingLeft: '40px', fontWeight: 'black', fontStyle: 'italic', marginTop: '0.2mm' }}>
                  * NOTE: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={kotDash} />
      </div>
    );
  }

  const stampColor = '#000000'; // Pure black for crisp thermal printing

  return (
    <div style={wrap}>

      {isEstimate && (
        <div style={{
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'center',
          border: '1.5px solid #000',
          padding: '1mm',
          fontWeight: '700',
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: '1mm',
          marginBottom: '2mm',
          color: '#000'
        }}>
          *** ESTIMATE SLIP ***
        </div>
      )}

      {/* LOGO */}
      <div style={{ ...center, marginTop: '2mm', marginBottom: '2mm' }}>
        <img
          src={Logo}
          alt="Zaiqa Mahal Logo"
          style={{ width: '30mm', height: '30mm', objectFit: 'contain', display: 'block', margin: '0 auto', filter: 'grayscale(100%) contrast(400%) brightness(85%)' }}
        />
      </div>

      {/* RESTAURANT NAME */}
      <div style={{ ...center, marginBottom: '2mm' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.2', color: '#000' }}>
          ZAIQA MAHAL
        </div>
        <div style={{ fontSize: '11px', color: '#000', marginTop: '1.5mm', lineHeight: '1.4', fontWeight: 'normal' }}>
          Chishtian Road, Near Ali Park<br />
          Hasilpur, 63000<br />
          Ph: 0300-3910101
        </div>
      </div>

      <div style={dash} />

      {/* ORDER INFO */}
      <div style={{ marginBottom: '1mm', position: 'relative' }}>

        {/* Ink Stamp / Gol Mohr */}
        {!isEstimate && currentPaymentStatus && currentPaymentStatus.toUpperCase() !== 'NONE' && currentPaymentStatus.toUpperCase() !== 'WITHOUT STAMP' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-10deg)',
            border: `3px double ${stampColor}`,
            borderRadius: '50%',
            width: '24mm',
            height: '24mm',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: stampColor,
            opacity: 0.85,
            fontWeight: '600',
            zIndex: 10,
            pointerEvents: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
          }}>
            {/* Inner dashed ring for authenticity */}
            <div style={{
              border: `1.2px dashed ${stampColor}`,
              borderRadius: '50%',
              width: '21mm',
              height: '21mm',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1.1',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '7.5px', fontWeight: '600', letterSpacing: '0.5px' }}>ZAIQA MAHAL</span>
              <span style={{ fontSize: '12px', fontWeight: '600', margin: '0.5mm 0', letterSpacing: '0.5px', textDecoration: 'underline' }}>
                {currentPaymentStatus}
              </span>
              <span style={{ fontSize: '6.5px', fontWeight: 'normal' }}>★ OFFICIAL ★</span>
            </div>
          </div>
        )}

        <div style={row}>
          <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Date:</span>
          <span style={{ fontWeight: '600' }}>{formatDate(date)}</span>
        </div>
        <div style={row}>
          <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Order No:</span>
          <span style={{ fontWeight: '600', fontSize: '13px' }}>#{orderId || 'PENDING'}</span>
        </div>
        {invNum && (
          <div style={row}>
            <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Invoice No:</span>
            <span style={{ fontWeight: '600', fontSize: '12px' }}>{invNum}</span>
          </div>
        )}
        {table && (typeof table === 'string' ? table !== 'Delivery' : table.area !== 'Delivery') && (
          <div style={row}>
            <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Table:</span>
            <span style={{ fontWeight: '600', fontSize: '12px' }}>{typeof table === 'object' ? `${table.area} - ${table.number}` : table}</span>
          </div>
        )}
        <div style={row}>
          <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Cashier:</span>
          <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{(() => {
            if (printData?.cashier) {
              try {
                if (typeof printData.cashier === 'string' && printData.cashier.startsWith('{')) {
                  const p = JSON.parse(printData.cashier);
                  return p.name || p.username || 'Staff';
                }
              } catch (e) { }
              if (typeof printData.cashier === 'object') {
                return printData.cashier.name || printData.cashier.username || 'Staff';
              }
              return printData.cashier;
            }
            try {
              const u = localStorage.getItem('pos_current_user');
              if (u) {
                const parsed = JSON.parse(u);
                return parsed.name || parsed.username || 'Staff';
              }
            } catch (e) { }
            return 'Staff';
          })()}</span>
        </div>
      </div>

      <div style={dash} />

      {/* CUSTOMER DETAILS */}
      {customerName &&
        customerName !== 'Walk-in Customer' &&
        customerName !== 'Walk-in Guest' &&
        customerName !== 'Table Guest' &&
        customerName !== 'Walk-in' &&
        customerName.trim() !== '' &&
        table !== 'Delivery' &&
        !(table && typeof table === 'object' && table.area === 'Delivery') && (
          <>
            <div style={{ marginBottom: '1.5mm', fontSize: '11px', color: '#000' }}>
              <div style={row}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Customer:</span>
                <span style={{ fontWeight: '600' }}>{customerName}</span>
              </div>
            </div>
            <div style={dash} />
          </>
        )}

      {/* DELIVERY DETAILS */}
      {(table === 'Delivery' || (table && typeof table === 'object' && table.area === 'Delivery')) && (
        <>
          <div style={{ marginBottom: '2.5mm', fontSize: '11px', color: '#000' }}>
            <div style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.5mm' }}>Delivery Details:</div>
            {customerName && customerName !== 'Delivery Guest' && customerName.trim() !== '' && (
              <div style={row}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Customer:</span>
                <span style={{ fontWeight: '600' }}>{customerName}</span>
              </div>
            )}
            {customerPhone && customerPhone !== 'N/A' && customerPhone.trim() !== '' && (
              <div style={row}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Phone:</span>
                <span style={{ fontWeight: '600' }}>{customerPhone}</span>
              </div>
            )}
            {deliveryAddress && (
              <div style={{ ...row, display: 'block', marginBottom: '1.5mm' }}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Address:</span>
                <div style={{ fontWeight: 'normal', paddingLeft: '2mm', marginTop: '0.5mm', whiteSpace: 'pre-wrap', fontSize: '11px', lineHeight: '1.3', color: '#000' }}>
                  {deliveryAddress}
                </div>
              </div>
            )}
            <div style={row}>
              <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Method:</span>
              <span style={{ fontWeight: '600' }}>
                {paymentMethod === 'online' ? '📱 ONLINE' : paymentMethod === 'khata' ? '💳 KHATA' : '💵 COD'}
              </span>
            </div>
            {transactionId && (
              <div style={row}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Txn ID:</span>
                <span style={{ fontWeight: '600' }}>{transactionId}</span>
              </div>
            )}
            {riderName && (
              <div style={row}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Rider:</span>
                <span style={{ fontWeight: '600' }}>{riderName}</span>
              </div>
            )}
            {remarks && (
              <div style={{ ...row, display: 'block', marginTop: '1mm' }}>
                <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Remarks:</span>
                <div style={{ fontWeight: 'normal', paddingLeft: '2mm', color: '#000' }}>{remarks}</div>
              </div>
            )}
          </div>
          <div style={dash} />
        </>
      )}

      {/* ITEMS HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: '1mm', color: '#000' }}>
        <span style={{ width: '30px' }}>QTY</span>
        <span style={{ flex: 1 }}>ITEM DESCRIPTION</span>
        <span style={{ textAlign: 'right', minWidth: '60px' }}>AMOUNT</span>
      </div>
      <div style={solid} />

      {/* ITEMS LIST */}
      <div style={{ marginBottom: '1mm' }}>
        {displayItems.map((item, index) => (
          <div key={index} style={{ marginBottom: '2.5mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#000', fontWeight: '600' }}>
              <span style={{ width: '30px', fontWeight: '600' }}>{item.qty}x</span>
              <span style={{ flex: 1, paddingRight: '3px', fontWeight: 'normal' }}>{item.name}</span>
              <span style={{ textAlign: 'right', minWidth: '60px', fontWeight: '600' }}>
                {(item.price * item.qty).toFixed(0)}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#000', paddingLeft: '30px', fontWeight: 'bold' }}>
              Rs. {item.price}
            </div>
          </div>
        ))}
      </div>

      <div style={dash} />

      {/* TOTALS */}
      <div style={{ marginBottom: '1.5mm' }}>
        <div style={row}>
          <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Subtotal:</span>
          <span style={{ fontWeight: '600' }}>Rs. {subtotal.toFixed(0)}</span>
        </div>
        {serviceChargesAmt > 0 && (
          <div style={row}>
            <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>Service Charges:</span>
            <span style={{ fontWeight: '600' }}>Rs. {serviceChargesAmt.toFixed(0)}</span>
          </div>
        )}
        {tax > 0 && (
          <div style={row}>
            <span style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: '11px' }}>GST / Tax:</span>
            <span style={{ fontWeight: '600' }}>Rs. {tax.toFixed(0)}</span>
          </div>
        )}
      </div>

      <div style={solid} />
      <div style={{ ...solid, marginTop: '0' }} />

      {/* GRAND TOTAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2mm 0 3mm 0', color: '#000' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>TOTAL</span>
        <span style={{ fontSize: '16px', fontWeight: '600' }}>Rs. {total.toFixed(0)}</span>
      </div>

      <div style={solid} />
      <div style={{ ...solid, marginTop: '0' }} />

      {/* FOOTER */}
      <div style={{ ...center, marginTop: '4mm' }}>
        <div style={{ fontSize: '9px', color: '#000', marginBottom: '3mm', lineHeight: '1.4', textAlign: 'left', paddingLeft: '0', fontWeight: 'normal' }}>
          Check order & cash before leaving.<br />
          * Not valid for court challenge.<br />
          * Served items cannot be changed/refunded.
        </div>
        <div style={dash} />
        <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', color: '#000' }}>
          THANK YOU
        </div>
        <div style={{ fontSize: '10px', color: '#000', marginTop: '1mm', fontWeight: 'normal' }}>
          Please visit again!
        </div>
        <div style={{ ...dash, margin: '3mm 0 2mm' }} />
        <div style={{ fontSize: '8px', color: '#000', letterSpacing: '0.3px', textAlign: 'center', fontWeight: 'normal' }}>
          Software Developed by Asper InfoTech Pvt. Ltd.
        </div>
      </div>
    </div>
  );
};

export default ReceiptSlip;
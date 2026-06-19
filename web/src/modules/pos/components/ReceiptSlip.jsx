import React from 'react';
import Logo from '../../../assets/Logo.jpg';

const ReceiptSlip = ({ printData }) => {
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
    payment_status
  } = printData;

  const currentPaymentStatus = paymentStatus || payment_status || 'PENDING';

  const invNum = (() => {
    if (invoiceNumber && !invoiceNumber.match(/^INV-\d+$/)) return invoiceNumber;
    if (invoice_number && !invoice_number.match(/^INV-\d+$/)) return invoice_number;
    const d = date ? new Date(date) : new Date();
    const dateStr = d.getFullYear() + 
                    String(d.getMonth() + 1).padStart(2, '0') + 
                    String(d.getDate()).padStart(2, '0');
    const stableSuffix = String(orderId || '0').padStart(4, '0');
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
    width: '72mm',
    background: '#ffffff',
    color: '#000000',
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: '13px',
    lineHeight: '1.4',
    padding: '4mm 1.5mm',
    boxSizing: 'border-box',
    position: 'relative',
  };

  const center = { textAlign: 'center' };
  const dash = { borderTop: '1.5px dashed #000', margin: '2.5mm 0' };
  const solid = { borderTop: '2px solid #000', margin: '1mm 0' };
  const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '1.2mm', fontSize: '13px', color: '#000' };

  const stampColor = 
    currentPaymentStatus.toUpperCase() === 'PAID' ? '#16a34a' :
    currentPaymentStatus.toUpperCase() === 'ONLINE PAID' ? '#2563eb' :
    currentPaymentStatus.toUpperCase() === 'PENDING' ? '#dc2626' : '#d97706';

  return (
    <div style={wrap}>

      {/* LOGO */}
      <div style={{ ...center, marginBottom: '3mm' }}>
        <img
          src={Logo}
          alt="Zaiqa Mahal Logo"
          style={{ width: '32mm', height: '32mm', objectFit: 'contain', display: 'block', margin: '0 auto', filter: 'grayscale(100%) contrast(150%)' }}
        />
      </div>

      {/* RESTAURANT NAME */}
      <div style={{ ...center, marginBottom: '2.5mm' }}>
        <div style={{ fontSize: '24px', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', lineHeight: '1.2', color: '#000' }}>
          ZAIQA MAHAL
        </div>
        <div style={{ fontSize: '13px', color: '#000', marginTop: '2mm', lineHeight: '1.5', fontWeight: '900', fontFamily: 'Arial, sans-serif' }}>
          Chishtian Road, Near Ali Park<br />
          Hasilpur, 63000<br />
          Ph: 0300-3910101
        </div>
      </div>

      <div style={dash} />

      {/* ORDER INFO */}
      <div style={{ marginBottom: '1mm', position: 'relative' }}>
        
        {/* Ink Stamp / Gol Mohr */}
        {currentPaymentStatus && currentPaymentStatus.toUpperCase() !== 'NONE' && currentPaymentStatus.toUpperCase() !== 'WITHOUT STAMP' && (
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
            fontFamily: '"Arial Black", Arial, sans-serif',
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
              <span style={{ fontSize: '7.5px', fontWeight: '950', letterSpacing: '0.5px' }}>ZAIQA MAHAL</span>
              <span style={{ fontSize: '12px', fontWeight: '950', margin: '0.5mm 0', letterSpacing: '0.5px', textDecoration: 'underline' }}>
                {currentPaymentStatus}
              </span>
              <span style={{ fontSize: '6.5px', fontWeight: '900' }}>★ OFFICIAL ★</span>
            </div>
          </div>
        )}

        <div style={row}>
          <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Date:</span>
          <span style={{ fontWeight: '800' }}>{formatDate(date)}</span>
        </div>
        <div style={row}>
          <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Order No:</span>
          <span style={{ fontWeight: '950', fontSize: '14px' }}>#{orderId || 'PENDING'}</span>
        </div>
        {invNum && (
          <div style={row}>
            <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Invoice No:</span>
            <span style={{ fontWeight: '950', fontSize: '13px' }}>{invNum}</span>
          </div>
        )}
        {table && (typeof table === 'string' ? table !== 'Delivery' : table.area !== 'Delivery') && (
          <div style={row}>
            <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Table:</span>
            <span style={{ fontWeight: '950', fontSize: '13px' }}>{typeof table === 'object' ? `${table.area} - ${table.number}` : table}</span>
          </div>
        )}
        <div style={row}>
          <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Cashier:</span>
          <span style={{ fontWeight: '800', textTransform: 'capitalize' }}>{(() => {
            if (printData?.cashier) {
              try {
                if (typeof printData.cashier === 'string' && printData.cashier.startsWith('{')) {
                  const p = JSON.parse(printData.cashier);
                  return p.name || p.username || 'Staff';
                }
              } catch(e){}
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
            } catch (e) {}
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
       customerName.trim() !== '' && (
        <>
          <div style={{ marginBottom: '1.5mm', fontSize: '11px', color: '#000' }}>
            <div style={row}>
              <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Customer:</span>
              <span style={{ fontWeight: '950' }}>{customerName}</span>
            </div>
            {customerPhone && customerPhone !== 'N/A' && customerPhone.trim() !== '' && (
              <div style={row}>
                <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Phone:</span>
                <span style={{ fontWeight: '800' }}>{customerPhone}</span>
              </div>
            )}
          </div>
          <div style={dash} />
        </>
      )}

      {/* DELIVERY DETAILS */}
      {(table === 'Delivery' || (table && typeof table === 'object' && table.area === 'Delivery')) && (
        <>
          <div style={{ marginBottom: '2.5mm', fontSize: '11px', color: '#000' }}>
            <div style={{ fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.5mm' }}>Delivery Details:</div>
            {deliveryAddress && (
              <div style={{ ...row, display: 'block', marginBottom: '1.5mm' }}>
                <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Address:</span>
                <div style={{ fontWeight: '800', paddingLeft: '2mm', marginTop: '0.5mm', whiteSpace: 'pre-wrap', fontSize: '11px', lineHeight: '1.3', color: '#000' }}>
                  {deliveryAddress}
                </div>
              </div>
            )}
            <div style={row}>
              <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Method:</span>
              <span style={{ fontWeight: '950' }}>
                {paymentMethod === 'online' ? '📱 ONLINE' : paymentMethod === 'khata' ? '💳 KHATA' : '💵 COD'}
              </span>
            </div>
            {transactionId && (
              <div style={row}>
                <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Txn ID:</span>
                <span style={{ fontWeight: '950' }}>{transactionId}</span>
              </div>
            )}
            {riderName && (
              <div style={row}>
                <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Rider:</span>
                <span style={{ fontWeight: '950' }}>{riderName}</span>
              </div>
            )}
            {remarks && (
              <div style={{ ...row, display: 'block', marginTop: '1mm' }}>
                <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Remarks:</span>
                <div style={{ fontWeight: '800', paddingLeft: '2mm', color: '#000' }}>{remarks}</div>
              </div>
            )}
          </div>
          <div style={dash} />
        </>
      )}

      {/* ITEMS HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: '1mm', color: '#000' }}>
        <span style={{ width: '30px' }}>QTY</span>
        <span style={{ flex: 1 }}>ITEM DESCRIPTION</span>
        <span style={{ textAlign: 'right', minWidth: '60px' }}>AMOUNT</span>
      </div>
      <div style={solid} />

      {/* ITEMS LIST */}
      <div style={{ marginBottom: '1mm' }}>
        {displayItems.map((item, index) => (
          <div key={index} style={{ marginBottom: '2.5mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#000', fontWeight: '800' }}>
              <span style={{ width: '30px', fontWeight: '950' }}>{item.qty}x</span>
              <span style={{ flex: 1, paddingRight: '3px' }}>{item.name}</span>
              <span style={{ textAlign: 'right', minWidth: '60px', fontWeight: '950' }}>
                {(item.price * item.qty).toFixed(0)}
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#444', paddingLeft: '30px', fontWeight: '500' }}>
              Rs. {item.price} each
            </div>
          </div>
        ))}
      </div>

      <div style={dash} />

      {/* TOTALS */}
      <div style={{ marginBottom: '1.5mm' }}>
        <div style={row}>
          <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Subtotal:</span>
          <span style={{ fontWeight: '800' }}>Rs. {subtotal.toFixed(0)}</span>
        </div>
        {serviceChargesAmt > 0 && (
          <div style={row}>
            <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>Service Charges:</span>
            <span style={{ fontWeight: '800' }}>Rs. {serviceChargesAmt.toFixed(0)}</span>
          </div>
        )}
        {tax > 0 && (
          <div style={row}>
            <span style={{ fontWeight: '500', textTransform: 'uppercase', fontSize: '11px' }}>GST / Tax:</span>
            <span style={{ fontWeight: '800' }}>Rs. {tax.toFixed(0)}</span>
          </div>
        )}
      </div>

      <div style={solid} />
      <div style={{ ...solid, marginTop: '0' }} />

      {/* GRAND TOTAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2mm 0 3mm 0', color: '#000' }}>
        <span style={{ fontSize: '15px', fontWeight: '950', letterSpacing: '1px' }}>TOTAL</span>
        <span style={{ fontSize: '20px', fontWeight: '950' }}>Rs. {total.toFixed(0)}</span>
      </div>

      <div style={solid} />
      <div style={{ ...solid, marginTop: '0' }} />

      {/* FOOTER */}
      <div style={{ ...center, marginTop: '4mm' }}>
        <div style={{ fontSize: '9.5px', color: '#000', marginBottom: '3mm', lineHeight: '1.5', textAlign: 'left', paddingLeft: '0', fontWeight: '700' }}>
          Please check your order and cash change before leaving.<br />
          No challenge in court once checked out.<br />
          Order once served or prepared cannot be changed.<br />
          Dues once paid are non-refundable.<br />
          Instagram: @zaiqamahal.pk
        </div>
        <div style={dash} />
        <div style={{ fontSize: '13px', fontWeight: '950', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#000' }}>
          THANK YOU
        </div>
        <div style={{ fontSize: '11px', color: '#000', marginTop: '1mm', fontWeight: 'bold' }}>
          Please visit again!
        </div>
        <div style={{ ...dash, margin: '3mm 0 2mm' }} />
        <div style={{ fontSize: '9px', color: '#000', letterSpacing: '0.3px', textAlign: 'center', fontWeight: 'bold' }}>
          Asper POS | Developed by Asper InfoTech Pvt Ltd
        </div>
      </div>
    </div>
  );
};

export default ReceiptSlip;


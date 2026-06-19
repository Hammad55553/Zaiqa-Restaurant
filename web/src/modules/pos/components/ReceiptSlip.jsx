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
    serviceCharges
  } = printData;

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
    padding: '4mm 2mm',
    boxSizing: 'border-box',
  };

  const center = { textAlign: 'center' };
  const dash = { borderTop: '1.5px dashed #000', margin: '2.5mm 0' };
  const solid = { borderTop: '2px solid #000', margin: '1mm 0' };
  const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '1.2mm', fontSize: '13px', color: '#000' };

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
      <div style={{ marginBottom: '1mm' }}>
        <div style={row}>
          <span style={{ fontWeight: '800' }}>Date:</span>
          <span style={{ fontWeight: '700' }}>{formatDate(date)}</span>
        </div>
        <div style={row}>
          <span style={{ fontWeight: '800' }}>Order No:</span>
          <span style={{ fontWeight: '950', fontSize: '14px' }}>#{orderId || 'PENDING'}</span>
        </div>
        {table && (typeof table === 'string' ? table !== 'Delivery' : table.area !== 'Delivery') && (
          <div style={row}>
            <span style={{ fontWeight: '800' }}>Table:</span>
            <span style={{ fontWeight: '950', fontSize: '13px' }}>{typeof table === 'object' ? `${table.area} - ${table.number}` : table}</span>
          </div>
        )}
        <div style={row}>
          <span style={{ fontWeight: '800' }}>Cashier:</span>
          <span style={{ fontWeight: '700' }}>{(() => {
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
        <div style={row}>
          <span style={{ fontWeight: '800' }}>Terminal:</span>
          <span style={{ fontWeight: '700' }}>Main POS</span>
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
              <span style={{ fontWeight: '800' }}>Customer:</span>
              <span style={{ fontWeight: '950' }}>{customerName}</span>
            </div>
            {customerPhone && customerPhone !== 'N/A' && customerPhone.trim() !== '' && (
              <div style={row}>
                <span style={{ fontWeight: '800' }}>Phone:</span>
                <span style={{ fontWeight: '700' }}>{customerPhone}</span>
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
                <span style={{ fontWeight: '800' }}>Address:</span>
                <div style={{ fontWeight: '950', paddingLeft: '2mm', marginTop: '0.5mm', whiteSpace: 'pre-wrap', fontSize: '11px', lineHeight: '1.3', color: '#000' }}>
                  {deliveryAddress}
                </div>
              </div>
            )}
            <div style={row}>
              <span style={{ fontWeight: '800' }}>Method:</span>
              <span style={{ fontWeight: '950' }}>
                {paymentMethod === 'online' ? '📱 ONLINE' : paymentMethod === 'khata' ? '💳 KHATA' : '💵 COD'}
              </span>
            </div>
            {transactionId && (
              <div style={row}>
                <span style={{ fontWeight: '800' }}>Txn ID:</span>
                <span style={{ fontWeight: '950' }}>{transactionId}</span>
              </div>
            )}
            {riderName && (
              <div style={row}>
                <span style={{ fontWeight: '800' }}>Rider:</span>
                <span style={{ fontWeight: '950' }}>{riderName}</span>
              </div>
            )}
            {remarks && (
              <div style={{ ...row, display: 'block', marginTop: '1mm' }}>
                <span style={{ fontWeight: '800' }}>Remarks:</span>
                <div style={{ fontWeight: '700', paddingLeft: '2mm', color: '#000' }}>{remarks}</div>
              </div>
            )}
          </div>
          <div style={dash} />
        </>
      )}

      {/* ITEMS HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: '1mm', color: '#000' }}>
        <span style={{ width: '30px' }}>QTY</span>
        <span style={{ flex: 1 }}>ITEM</span>
        <span style={{ textAlign: 'right', minWidth: '60px' }}>AMT</span>
      </div>
      <div style={solid} />

      {/* ITEMS LIST */}
      <div style={{ marginBottom: '1mm' }}>
        {displayItems.map((item, index) => (
          <div key={index} style={{ marginBottom: '2.5mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#000', fontWeight: '700' }}>
              <span style={{ width: '30px', fontWeight: '950' }}>{item.qty}x</span>
              <span style={{ flex: 1, paddingRight: '3px' }}>{item.name}</span>
              <span style={{ textAlign: 'right', minWidth: '60px', fontWeight: '950' }}>
                {(item.price * item.qty).toFixed(0)}
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#000', paddingLeft: '30px', fontWeight: '700' }}>
              Rs. {item.price} x {item.qty}
            </div>
          </div>
        ))}
      </div>

      <div style={dash} />

      {/* TOTALS */}
      <div style={{ marginBottom: '1.5mm' }}>
        <div style={row}>
          <span style={{ fontWeight: '700' }}>Subtotal</span>
          <span style={{ fontWeight: '800' }}>Rs. {subtotal.toFixed(0)}</span>
        </div>
        {serviceChargesAmt > 0 && (
          <div style={row}>
            <span style={{ fontWeight: '700' }}>Service Charges</span>
            <span style={{ fontWeight: '800' }}>Rs. {serviceChargesAmt.toFixed(0)}</span>
          </div>
        )}
        {tax > 0 && (
          <div style={row}>
            <span style={{ fontWeight: '700' }}>GST / Tax</span>
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
        <div style={{ fontSize: '9.5px', color: '#000', marginBottom: '3mm', lineHeight: '1.5', textAlign: 'left', paddingLeft: '1mm', fontWeight: '700' }}>
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


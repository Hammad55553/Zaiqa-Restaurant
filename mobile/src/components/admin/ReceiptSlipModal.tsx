import React, { useRef } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import RNShare from 'react-native-share';
import RNPrint from 'react-native-print';
import { useToast } from '../Toast';
import { Share2, Printer, X } from 'lucide-react-native';
import { useState } from 'react';

interface ReceiptSlipModalProps {
  order: any | null;
  onClose: () => void;
}

const generateReceiptHTML = (order: any, displayItems: any[], cashierName: string, dateFormatted: string, invStr: string, subtotalVal: number, serviceChargesAmt: number, taxAmt: number, stampColor: string, currentPaymentStatus: string) => {
  const itemsHtml = displayItems.map((item: any) => {
    const qty = item.qty || item.quantity || 0;
    const name = item.name || item.item_name || '';
    const price = item.price || 0;
    const total = qty * price;
    return `
      <tr>
        <td style="font-weight: bold;">${qty}x</td>
        <td>${name}<br/><span style="font-size: 10px; color: #444;">Rs. ${price}</span></td>
        <td style="text-align: right; font-weight: bold;">Rs. ${total.toFixed(0)}</td>
      </tr>
    `;
  }).join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 10px;
            color: #000000;
            background-color: #ffffff;
            margin: 0;
          }
          .center { text-align: center; }
          .logo-placeholder {
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 2px;
            letter-spacing: 2px;
          }
          .title { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
          .sub { font-size: 11px; margin-bottom: 8px; line-height: 1.4; font-weight: bold; }
          .divider { border-top: 1px dashed #000000; margin: 8px 0; }
          .divider-solid { border-top: 2px solid #000000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; font-weight: bold; }
          .bold { font-weight: 900; }
          .stamp {
            border: 3px double ${stampColor};
            padding: 6px;
            text-align: center;
            margin: 12px auto;
            width: 140px;
            transform: rotate(-6deg);
            font-size: 13px;
            font-weight: 900;
            background-color: #ffffff;
          }
          .stamp-title { font-size: 8px; font-weight: 900; margin-bottom: 2px; }
          .stamp-main { font-size: 14px; font-weight: 900; text-decoration: underline; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { border-bottom: 1px solid #000000; text-align: left; font-size: 11px; padding: 4px 0; font-weight: 900; }
          td { font-size: 11px; padding: 6px 0; vertical-align: top; }
          .text-right { text-align: right; }
          .totals-container { margin-top: 6px; }
          .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; font-weight: bold; }
          .grand-total { font-size: 16px; font-weight: 900; margin-top: 6px; }
          .footer-disclaimers { font-size: 9px; line-height: 1.3; font-weight: bold; text-align: left; margin-top: 12px; }
          .thank-you { font-size: 12px; font-weight: 900; text-align: center; margin-top: 12px; letter-spacing: 1px; }
          .visit-again { font-size: 11px; font-weight: bold; text-align: center; margin-top: 3px; }
          .developer-credit { font-size: 8px; font-weight: bold; text-align: center; margin-top: 10px; color: #333; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="logo-placeholder">★ ★ ★</div>
          <div class="title">ZAIQA MAHAL</div>
          <div class="sub">
            Chishtian Road, Near Ali Park<br/>
            Hasilpur, 63000<br/>
            Ph: 0300-3910101
          </div>
        </div>
        <div class="divider"></div>
        
        ${currentPaymentStatus && currentPaymentStatus.toUpperCase() !== 'NONE' && currentPaymentStatus.toUpperCase() !== 'WITHOUT STAMP' ? `
        <div class="stamp" style="color: ${stampColor}; border-color: ${stampColor};">
          <div class="stamp-title" style="color: ${stampColor};">ZAIQA MAHAL</div>
          <div class="stamp-main" style="color: ${stampColor};">${currentPaymentStatus}</div>
          <div class="stamp-title" style="color: ${stampColor};">★ OFFICIAL ★</div>
        </div>
        ` : ''}

        <div class="row"><span>DATE:</span><span>${dateFormatted}</span></div>
        <div class="row"><span>ORDER NO:</span><span style="font-size: 13px;">#${order.id}</span></div>
        <div class="row"><span>INVOICE NO:</span><span>${invStr}</span></div>
        ${order.area !== 'Delivery' && order.table_number !== 'Delivery' ? `
        <div class="row"><span>TABLE:</span><span>${order.table_number} (${order.area})</span></div>
        ` : ''}
        <div class="row"><span>CASHIER:</span><span>${cashierName}</span></div>
        <div class="divider"></div>

        ${order.customer_name &&
          order.customer_name !== 'Walk-in Customer' &&
          order.customer_name !== 'Walk-in Guest' &&
          order.customer_name !== 'Table Guest' &&
          order.customer_name !== 'Walk-in' &&
          order.customer_name.trim() !== '' ? `
          <div class="row"><span>CUSTOMER:</span><span>${order.customer_name}</span></div>
          ${order.customer_phone && order.customer_phone !== 'N/A' && order.customer_phone.trim() !== '' ? `
            <div class="row"><span>PHONE:</span><span>${order.customer_phone}</span></div>
          ` : ''}
          <div class="divider"></div>
        ` : ''}

        ${order.area === 'Delivery' || order.table_number === 'Delivery' ? `
          <div class="row" style="font-size: 11px;"><span>DELIVERY DETAILS:</span></div>
          ${order.delivery_address && order.delivery_address !== 'N/A' ? `
            <div style="font-size: 11px; margin: 3px 0; font-weight: bold; padding-left: 8px;">ADDRESS: ${order.delivery_address}</div>
          ` : ''}
          <div class="row" style="padding-left: 8px;"><span>METHOD:</span><span>${order.payment_method === 'online' ? '📱 ONLINE' : order.payment_method === 'khata' ? '💳 KHATA' : '💵 COD'}</span></div>
          ${order.transaction_id ? `<div class="row" style="padding-left: 8px;"><span>TXN ID:</span><span>${order.transaction_id}</span></div>` : ''}
          ${order.rider_name || order.delivered_by ? `<div class="row" style="padding-left: 8px;"><span>RIDER:</span><span>${order.rider_name || order.delivered_by}</span></div>` : ''}
          ${order.remarks && !order.remarks.startsWith('Delivery Order') ? `<div style="font-size: 11px; margin: 3px 0; font-weight: bold; padding-left: 8px;">REMARKS: ${order.remarks}</div>` : ''}
          <div class="divider"></div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">QTY</th>
              <th>ITEM DESCRIPTION</th>
              <th style="text-align: right; width: 80px;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="totals-container">
          <div class="total-row"><span>Subtotal:</span><span>Rs. ${subtotalVal.toFixed(0)}</span></div>
          ${serviceChargesAmt > 0 ? `<div class="total-row"><span>Service Charges:</span><span>Rs. ${serviceChargesAmt.toFixed(0)}</span></div>` : ''}
          ${taxAmt > 0 ? `<div class="total-row"><span>GST / Tax:</span><span>Rs. ${taxAmt.toFixed(0)}</span></div>` : ''}
        </div>
        
        <div class="divider-solid"></div>
        <div class="total-row grand-total"><span>TOTAL</span><span>Rs. ${order.total_amount.toFixed(0)}</span></div>
        <div class="divider-solid"></div>
        
        <div class="footer-disclaimers">
          Please check your order and cash change before leaving.<br/>
          Not valid for court. No challenge once checked out.<br/>
          Order once served or prepared cannot be changed.<br/>
          Dues once paid are non-refundable.<br/>
          Instagram: @zaiqamahal.pk
        </div>
        
        <div class="divider"></div>
        <div class="thank-you">THANK YOU</div>
        <div class="visit-again">Please visit again!</div>
        <div class="divider"></div>
        <div class="developer-credit">Software Developed by Asper InfoTech Pvt. Ltd.</div>
      </body>
    </html>
  `;
};

export default function ReceiptSlipModal({ order, onClose }: ReceiptSlipModalProps) {
  const toast = useToast();
  const viewShotRef = useRef<any>(null);
  const [showOptionSelector, setShowOptionSelector] = useState(false);

  console.log('Rendering ReceiptSlipModal, order ID:', order ? order.id : 'null');
  if (!order) {
    return <Modal visible={false} transparent />
  }

  const currentPaymentStatus = order.payment_status || order.paymentStatus || (order.status === 'completed' ? 'PAID' : 'PENDING');
  
  const stampColor =
    currentPaymentStatus.toUpperCase() === 'PAID' ? '#16a34a' :
    currentPaymentStatus.toUpperCase() === 'ONLINE PAID' ? '#2563eb' :
    currentPaymentStatus.toUpperCase() === 'PENDING' ? '#dc2626' : '#d97706';

  const orderRemarks = order.remarks || '';
  const phoneMatch = orderRemarks.match(/Phone:\s*([0-9+]+)/i);
  const addressMatch = orderRemarks.match(/Address:\s*([^;\n]+)/i);
  const methodMatch = orderRemarks.match(/Method:\s*(\w+)/i);
  const txMatch = orderRemarks.match(/Txn ID:\s*([^\s,\n]+)/i);
  const riderMatch = orderRemarks.match(/Rider:\s*([^,\n]+)/i);

  const parsedPhone = phoneMatch ? phoneMatch[1] : (order.customer_phone || order.customerPhone || '');
  const parsedAddress = addressMatch ? addressMatch[1] : (order.delivery_address || order.deliveryAddress || '');
  const parsedMethod = methodMatch ? methodMatch[1] : (order.payment_method || order.paymentMethod || 'cod');
  const parsedTxnId = txMatch ? txMatch[1] : (order.transaction_id || order.transactionId || '');
  const parsedRider = riderMatch ? riderMatch[1] : (order.rider_name || order.riderName || order.delivered_by || '');

  let parsedItems = [];
  try {
    if (typeof order.items === 'string') {
      parsedItems = JSON.parse(order.items);
    } else if (Array.isArray(order.items)) {
      parsedItems = order.items;
    }
  } catch (e) {
    console.warn('Error parsing order items for slip:', e);
  }

  const displayItems = parsedItems.filter((item: any) => (item.name || item.item_name) !== 'Service Charges');
  const serviceChargesAmt = order.service_charges !== undefined
    ? Number(order.service_charges)
    : parsedItems.find((item: any) => (item.name || item.item_name) === 'Service Charges')?.price || 0;
  const taxAmt = order.tax || 0;
  const subtotalVal = order.subtotal !== undefined && order.subtotal !== null
    ? Number(order.subtotal)
    : (order.total_amount - serviceChargesAmt - taxAmt);

  const dateFormatted = new Date(order.created_at || Date.now()).toLocaleString('en-PK', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const invStr = order.invoice_number || order.invoiceNumber || (() => {
    const d = order.created_at ? new Date(order.created_at) : new Date();
    const dateStr = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const stableSuffix = String(order.id || '0').padStart(4, '0');
    return `INV-${dateStr}-${stableSuffix}`;
  })();

  const cashierName = (() => {
    const cashierVal = order.cashier || order.created_by;
    if (cashierVal) {
      try {
        if (typeof cashierVal === 'string' && cashierVal.startsWith('{')) {
          const p = JSON.parse(cashierVal);
          return p.name || p.username || 'Staff';
        }
      } catch (e) { }
      if (typeof cashierVal === 'object') {
        return cashierVal.name || cashierVal.username || 'Staff';
      }
      return cashierVal;
    }
    return 'Staff';
  })();

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.slipModalOverlay}>
        <View style={styles.slipCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ backgroundColor: '#ffffff', padding: 12 }}>
              {/* Logo / Header */}
              <View style={styles.slipCenter}>
                <Image source={require('../../../assets/Logo.jpg')} style={styles.slipLogo as any} resizeMode="contain" />
                <Text style={styles.slipTitle}>ZAIQA MAHAL</Text>
                <Text style={styles.slipSub}>
                  Chishtian Road, Near Ali Park{"\n"}
                  Hasilpur, 63000{"\n"}
                  Ph: 0300-3910101
                </Text>
              </View>

              <View style={styles.slipDividerDashed} />

              {/* Stamp (Official Paid/Pending Indicator) */}
              {currentPaymentStatus && currentPaymentStatus.toUpperCase() !== 'NONE' && currentPaymentStatus.toUpperCase() !== 'WITHOUT STAMP' && (
                <View style={[styles.slipStamp, { borderColor: stampColor }]}>
                  <View style={[styles.slipStampInner, { borderColor: stampColor }]}>
                    <Text style={[styles.slipStampTextSmall, { color: stampColor }]}>ZAIQA MAHAL</Text>
                    <Text style={[styles.slipStampTextMain, { color: stampColor }]}>
                      {currentPaymentStatus}
                    </Text>
                    <Text style={[styles.slipStampTextSmall, { color: stampColor, fontWeight: '900' }]}>★ OFFICIAL ★</Text>
                  </View>
                </View>
              )}

              {/* Order Metadata */}
              <View style={styles.slipMetaContainer}>
                <View style={styles.slipRow}>
                  <Text style={styles.slipMetaLabel}>DATE:</Text>
                  <Text style={styles.slipMetaVal}>{dateFormatted}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipMetaLabel}>ORDER NO:</Text>
                  <Text style={[styles.slipMetaVal, { fontSize: 14, fontWeight: '900' }]}>#{order.id}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipMetaLabel}>INVOICE NO:</Text>
                  <Text style={styles.slipMetaVal}>{invStr}</Text>
                </View>
                {order.area !== 'Delivery' && order.table_number !== 'Delivery' && (
                  <View style={styles.slipRow}>
                    <Text style={styles.slipMetaLabel}>TABLE:</Text>
                    <Text style={styles.slipMetaVal}>{order.table_number} ({order.area})</Text>
                  </View>
                )}
                <View style={styles.slipRow}>
                  <Text style={styles.slipMetaLabel}>CASHIER:</Text>
                  <Text style={styles.slipMetaVal}>{cashierName}</Text>
                </View>
              </View>

              <View style={styles.slipDividerDashed} />

              {/* Customer Details */}
              {order.customer_name &&
                order.customer_name !== 'Walk-in Customer' &&
                order.customer_name !== 'Walk-in Guest' &&
                order.customer_name !== 'Table Guest' &&
                order.customer_name !== 'Walk-in' &&
                order.customer_name.trim() !== '' && (
                  <>
                    <View style={styles.slipMetaContainer}>
                      <View style={styles.slipRow}>
                        <Text style={styles.slipMetaLabel}>CUSTOMER:</Text>
                        <Text style={styles.slipMetaVal}>{order.customer_name}</Text>
                      </View>
                      {parsedPhone && parsedPhone !== 'N/A' && parsedPhone.trim() !== '' && (
                        <View style={styles.slipRow}>
                          <Text style={styles.slipMetaLabel}>PHONE:</Text>
                          <Text style={styles.slipMetaVal}>{parsedPhone}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.slipDividerDashed} />
                  </>
                )}

              {/* Delivery Details */}
              {(order.area === 'Delivery' || order.table_number === 'Delivery') && (
                <>
                  <View style={styles.slipMetaContainer}>
                    <Text style={[styles.slipMetaLabel, { fontSize: 12, marginBottom: 4, fontWeight: '900' }]}>DELIVERY DETAILS:</Text>
                    {parsedAddress && parsedAddress !== 'N/A' && (
                      <View style={[styles.slipRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <Text style={styles.slipMetaLabel}>ADDRESS:</Text>
                        <Text style={[styles.slipMetaVal, { paddingLeft: 8, marginTop: 2, fontWeight: '700' }]}>{parsedAddress}</Text>
                      </View>
                    )}
                    <View style={styles.slipRow}>
                      <Text style={styles.slipMetaLabel}>METHOD:</Text>
                      <Text style={styles.slipMetaVal}>
                        {parsedMethod === 'online' ? '📱 ONLINE' : parsedMethod === 'khata' ? '💳 KHATA' : '💵 COD'}
                      </Text>
                    </View>
                    {parsedTxnId && parsedTxnId !== '' && (
                      <View style={styles.slipRow}>
                        <Text style={styles.slipMetaLabel}>TXN ID:</Text>
                        <Text style={styles.slipMetaVal}>{parsedTxnId}</Text>
                      </View>
                    )}
                    {parsedRider && parsedRider !== '' && (
                      <View style={styles.slipRow}>
                        <Text style={styles.slipMetaLabel}>RIDER:</Text>
                        <Text style={styles.slipMetaVal}>{parsedRider}</Text>
                      </View>
                    )}
                    {order.remarks && !order.remarks.startsWith('Delivery Order') && (
                      <View style={[styles.slipRow, { flexDirection: 'column', alignItems: 'flex-start', marginTop: 4 }]}>
                        <Text style={styles.slipMetaLabel}>REMARKS:</Text>
                        <Text style={[styles.slipMetaVal, { paddingLeft: 8, fontWeight: '700' }]}>{order.remarks}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.slipDividerDashed} />
                </>
              )}

              {/* Itemized Table */}
              <View style={styles.slipTableHeader}>
                <Text style={[styles.slipCol, { width: 30 }]}>QTY</Text>
                <Text style={[styles.slipCol, { flex: 1 }]}>ITEM DESCRIPTION</Text>
                <Text style={[styles.slipCol, { textAlign: 'right', minWidth: 60 }]}>AMOUNT</Text>
              </View>
              <View style={styles.slipDividerSolid} />

              {displayItems.map((item: any, idx: number) => {
                const qty = item.qty || item.quantity || 0;
                const name = item.name || item.item_name || '';
                const price = item.price || 0;
                const total = qty * price;
                return (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ width: 30, fontSize: 13, color: '#000000', fontWeight: '900' }}>{qty}x</Text>
                      <Text style={{ flex: 1, fontSize: 13, color: '#000000', fontWeight: '800', paddingRight: 3 }}>{name}</Text>
                      <Text style={{ textAlign: 'right', minWidth: 60, fontSize: 13, color: '#000000', fontWeight: '900' }}>Rs. {total.toFixed(0)}</Text>
                    </View>
                    <Text style={{ fontSize: 10.5, color: '#444444', paddingLeft: 30, fontWeight: '500' }}>Rs. {price}</Text>
                  </View>
                );
              })}

              <View style={styles.slipDividerDashed} />

              {/* Totals Summary */}
              <View style={styles.slipTotalsContainer}>
                <View style={styles.slipRow}>
                  <Text style={styles.slipTotalLabel}>Subtotal:</Text>
                  <Text style={styles.slipTotalVal}>Rs. {subtotalVal.toFixed(0)}</Text>
                </View>
                {serviceChargesAmt > 0 && (
                  <View style={styles.slipRow}>
                    <Text style={styles.slipTotalLabel}>Service Charges:</Text>
                    <Text style={styles.slipTotalVal}>Rs. {serviceChargesAmt.toFixed(0)}</Text>
                  </View>
                )}
                {taxAmt > 0 && (
                  <View style={styles.slipRow}>
                    <Text style={styles.slipTotalLabel}>GST / Tax:</Text>
                    <Text style={styles.slipTotalVal}>Rs. {taxAmt.toFixed(0)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.slipDividerSolid} />
              <View style={[styles.slipDividerSolid, { marginTop: 1 }]} />

              {/* Grand Total */}
              <View style={[styles.slipRow, { marginVertical: 8 }]}>
                <Text style={[styles.slipTotalLabel, { fontSize: 15, fontWeight: '900', letterSpacing: 1 }]}>TOTAL</Text>
                <Text style={[styles.slipTotalVal, { fontSize: 20, fontWeight: '900' }]}>Rs. {order.total_amount.toFixed(0)}</Text>
              </View>

              <View style={styles.slipDividerSolid} />
              <View style={[styles.slipDividerSolid, { marginTop: 1 }]} />

              {/* Footer */}
              <View style={[styles.slipCenter, { marginTop: 16 }]}>
                <Text style={styles.slipFooterDisclaimers}>
                  Please check your order and cash change before leaving.{"\n"}
                  Not valid for court. No challenge once checked out.{"\n"}
                  Order once served or prepared cannot be changed.{"\n"}
                  Dues once paid are non-refundable.{"\n"}
                  Instagram: @zaiqamahal.pk
                </Text>
                
                <View style={styles.slipDividerDashed} />
                
                <Text style={styles.slipThankYou}>THANK YOU</Text>
                <Text style={styles.slipVisitAgain}>Please visit again!</Text>
                
                <View style={[styles.slipDividerDashed, { marginVertical: 8, width: '100%' }]} />
                
                <Text style={styles.slipDeveloperCredit}>
                  Software Developed by Asper InfoTech Pvt. Ltd.
                </Text>
              </View>
            </ViewShot>
          </ScrollView>

          {/* Actions */}
          <View style={styles.slipActions}>
            <TouchableOpacity
              style={[styles.slipActionBtn, { backgroundColor: '#334155' }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.slipActionBtnText}>Close</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.slipActionBtn, { backgroundColor: '#f97316' }]}
              onPress={() => setShowOptionSelector(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.slipActionBtnText}>Print/Share Slip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CUSTOM OPTION SELECTOR BOTTOM DRAWER */}
      <Modal
        visible={showOptionSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionSelector(false)}
      >
        <TouchableOpacity
          style={styles.selectorOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionSelector(false)}
        >
          <TouchableOpacity
            style={styles.selectorCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()} // Prevents closing when clicking inside card
          >
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Export & Print Receipt</Text>
              <TouchableOpacity onPress={() => setShowOptionSelector(false)} style={styles.selectorCloseBtn}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.selectorDesc}>Select how you would like to export Order #{order.id}:</Text>

            <TouchableOpacity
              style={styles.selectorOption}
              activeOpacity={0.8}
              onPress={async () => {
                setShowOptionSelector(false);
                try {
                  if (viewShotRef.current) {
                    const uri = await viewShotRef.current.capture();
                    await RNShare.open({
                      url: uri,
                      type: 'image/png',
                      title: `Receipt_Order_${order.id}`,
                    });
                    toast.success('Shared', 'Image receipt shared successfully.');
                  } else {
                    toast.error('Error', 'Slip rendering not ready.');
                  }
                } catch (e) {
                  toast.error('Failed', 'Could not generate or share image.');
                }
              }}
            >
              <View style={[styles.selectorIconCircle, { backgroundColor: '#fff7ed' }]}>
                <Share2 size={20} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectorOptionTitle}>Share as Image</Text>
                <Text style={styles.selectorOptionDesc}>Share high-quality PNG image receipt via WhatsApp/Socials</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectorOption}
              activeOpacity={0.8}
              onPress={async () => {
                setShowOptionSelector(false);
                try {
                  const htmlContent = generateReceiptHTML(
                    order,
                    displayItems,
                    cashierName,
                    dateFormatted,
                    invStr,
                    subtotalVal,
                    serviceChargesAmt,
                    taxAmt,
                    stampColor,
                    currentPaymentStatus
                  );

                  await RNPrint.print({
                    html: htmlContent,
                  });
                  toast.success('Print Dialog Opened', 'Opening native print/save-as-PDF view...');
                } catch (e) {
                  toast.error('Failed', 'Could not generate or print PDF.');
                }
              }}
            >
              <View style={[styles.selectorIconCircle, { backgroundColor: '#e0f2fe' }]}>
                <Printer size={20} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectorOptionTitle}>Print / Save as PDF</Text>
                <Text style={styles.selectorOptionDesc}>Print directly to a thermal printer or save as PDF file</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectorCancelBtn}
              activeOpacity={0.7}
              onPress={() => setShowOptionSelector(false)}
            >
              <Text style={styles.selectorCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  slipCard: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  slipCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  slipLogo: {
    width: 64,
    height: 64,
    marginBottom: 8,
    borderRadius: 32,
  },
  slipTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  slipSub: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  slipDividerDashed: {
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  slipDividerSolid: {
    borderWidth: 1,
    borderColor: '#000000',
    marginVertical: 12,
  },
  slipStamp: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    marginLeft: -48,
    width: 96,
    height: 96,
    borderWidth: 3,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 10,
    opacity: 0.85,
  },
  slipStampInner: {
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 42,
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipStampTextSmall: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  slipStampTextMain: {
    fontSize: 12,
    fontWeight: '900',
    marginVertical: 2,
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  slipMetaContainer: {
    marginVertical: 4,
    gap: 4,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slipMetaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  slipMetaVal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  slipTableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#000000',
    marginBottom: 8,
  },
  slipCol: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
  },
  slipTotalsContainer: {
    gap: 4,
    marginVertical: 4,
  },
  slipTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  slipTotalVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  slipFooterDisclaimers: {
    fontSize: 9.5,
    color: '#000000',
    marginBottom: 12,
    lineHeight: 14,
    textAlign: 'left',
    width: '100%',
    fontWeight: '700',
  },
  slipThankYou: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#000000',
    textAlign: 'center',
  },
  slipVisitAgain: {
    fontSize: 11,
    color: '#000000',
    marginTop: 4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  slipDeveloperCredit: {
    fontSize: 9,
    color: '#000000',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontWeight: 'bold',
    width: '100%',
  },
  slipActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 16,
  },
  slipActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slipActionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  // Custom selector styles
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  selectorCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  selectorCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
    fontWeight: '600',
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  selectorIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  selectorOptionDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  selectorCancelBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginTop: 8,
  },
  selectorCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
});

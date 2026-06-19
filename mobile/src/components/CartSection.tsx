import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Trash2, Minus, Plus, Send, FileText, Receipt, ShoppingBag, Ban } from 'lucide-react-native';

interface CartItem {
  id: any;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  category_name?: string;
  sent?: boolean;
  originalQty?: number;
}

interface CartSectionProps {
  cartItems: CartItem[];
  setCartItems: (items: any) => void;
  updateQty: (id: any, delta: number) => void;
  remarks: string;
  setRemarks: (text: string) => void;
  cartTotal: number;
  handlePlaceOrder: () => void;
  placingOrder: boolean;
  activeOrder?: any;
  onRequestBill?: () => void;
  onCancelOrder?: () => void;        // direct cancel (pending orders only)
  onRequestCancel?: () => void;      // request cancel (preparing/ready)
  cancelRequestStatus?: string | null; // 'pending' | 'approved' | 'rejected' | null
  role?: string;                     // 'waiter' | 'cashier' | 'admin'
}

export default function CartSection({
  cartItems,
  setCartItems,
  updateQty,
  remarks,
  setRemarks,
  cartTotal,
  handlePlaceOrder,
  placingOrder,
  activeOrder,
  onRequestBill,
  onCancelOrder,
  onRequestCancel,
  cancelRequestStatus,
  role = 'waiter'
}: CartSectionProps) {
  const sentItems = cartItems.filter(item => item.sent);
  const newItems = cartItems.filter(item => !item.sent);

  return (
    <View style={styles.cartDrawer}>
      {/* Premium Header */}
      <View style={styles.cartHeader}>
        <View style={styles.cartTitleRow}>
          <Receipt size={16} color="#ea580c" style={{ marginRight: 6 }} />
          <Text style={styles.cartTitle}>ACTIVE KITCHEN TICKET</Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity 
            style={styles.clearAllBtn}
            onPress={() => setCartItems([])}
            activeOpacity={0.7}
          >
            <Trash2 size={13} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={styles.clearAllText}>CLEAR SLIP</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart Items List */}
      <ScrollView 
        style={styles.cartItemsScroll} 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {cartItems.length === 0 ? (
          <View style={styles.emptyCartPlaceholder}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={36} color="#94a3b8" />
            </View>
            <Text style={styles.emptyCartText}>Ticket is empty</Text>
            <Text style={styles.emptyCartSub}>Select items from the catalog on the left to build the order.</Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {sentItems.length > 0 && (
              <View style={styles.sentContainer}>
                <Text style={styles.sentHeaderTitle}>SENT ITEMS (COOKING IN KITCHEN)</Text>
                <View style={{ gap: 8 }}>
                  {sentItems.map(item => (
                    <View key={item.id} style={[styles.cartItemRow, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.cartItemName, { color: '#334155' }]} numberOfLines={1}>{item.name}</Text>
                          {role !== 'waiter' && (
                            <TouchableOpacity 
                              onPress={() => setCartItems((prev: any) => prev.filter((i: any) => i.id !== item.id))}
                              activeOpacity={0.7}
                            >
                              <Trash2 size={13} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.cartItemPrice}>Rs. {item.price} x {item.qty}</Text>
                        <TextInput 
                          placeholder="Add comments (e.g. extra gravy)..."
                          placeholderTextColor="#94a3b8"
                          value={item.notes || ''}
                          onChangeText={(text) => {
                            setCartItems((prev: any) => prev.map((i: any) => i.id === item.id ? { ...i, notes: text } : i));
                          }}
                          style={styles.itemNotesInput}
                        />
                      </View>
                      <View style={styles.rightControlRow}>
                        <Text style={[styles.itemSubtotal, { color: '#475569' }]}>Rs. {item.price * item.qty}</Text>
                        <View style={styles.qtyContainer}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                            <Minus size={11} color="#64748b" />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.qty}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                            <Plus size={11} color="#64748b" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {newItems.length > 0 && (
              <View>
                <Text style={styles.newHeaderTitle}>NEW ITEMS TO SEND</Text>
                <View style={{ gap: 8 }}>
                  {newItems.map(item => (
                    <View key={item.id} style={styles.cartItemRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                          <TouchableOpacity 
                            onPress={() => setCartItems((prev: any) => prev.filter((i: any) => i.id !== item.id))}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.cartItemPrice}>Rs. {item.price} x {item.qty}</Text>
                        <TextInput 
                          placeholder="Add comments (e.g. extra gravy)..."
                          placeholderTextColor="#94a3b8"
                          value={item.notes || ''}
                          onChangeText={(text) => {
                            setCartItems((prev: any) => prev.map((i: any) => i.id === item.id ? { ...i, notes: text } : i));
                          }}
                          style={styles.itemNotesInput}
                        />
                      </View>
                      <View style={styles.rightControlRow}>
                        <Text style={styles.itemSubtotal}>Rs. {item.price * item.qty}</Text>
                        <View style={styles.qtyContainer}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                            <Minus size={11} color="#64748b" />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.qty}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                            <Plus size={11} color="#64748b" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Kitchen Remarks Section */}
      <View style={styles.remarksGroup}>
        <View style={styles.remarksLabelRow}>
          <FileText size={12} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.remarksLabel}>KITCHEN INSTRUCTIONS / REMARKS</Text>
        </View>
        <TextInput
          placeholder="e.g. Less spicy, serve Naan hot, soup first..."
          placeholderTextColor="#94a3b8"
          value={remarks}
          onChangeText={setRemarks}
          multiline={true}
          numberOfLines={3}
          style={styles.remarksInput}
          textAlignVertical="top"
        />
      </View>

      {/* Order Summary & Dispatch Trigger */}
      <View style={[styles.cartFooter, { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 8 }}>
          <Text style={styles.totalLabel}>TOTAL BILL VALUE</Text>
          <Text style={[styles.totalValue, { marginTop: 0, fontSize: 22 }]}>Rs. {cartTotal}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
          <TouchableOpacity 
            style={[
              styles.submitOrderBtn, 
              cartItems.length === 0 && styles.submitOrderBtnDisabled,
              { flex: 1, height: 48, borderRadius: 12 }
            ]} 
            onPress={handlePlaceOrder}
            disabled={placingOrder || cartItems.length === 0}
            activeOpacity={0.8}
          >
            {placingOrder ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitOrderText}>
                  {activeOrder ? 'UPDATE ORDER' : 'SEND TO KITCHEN'}
                </Text>
                <Send size={12} color="#ffffff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          {activeOrder && (
            <TouchableOpacity 
              style={[styles.requestBillBtn, { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#0f172a' }]} 
              onPress={onRequestBill}
              disabled={placingOrder}
              activeOpacity={0.8}
            >
              <Text style={styles.requestBillText}>REQUEST BILL</Text>
              <Receipt size={12} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Smart Cancel / Request Cancel Block */}
        {activeOrder && (
          <View style={{ marginTop: 4 }}>
            {/* Pending cancel request banner */}
            {cancelRequestStatus === 'pending' && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 12, borderWidth: 1, borderColor: '#fcd34d', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 12, letterSpacing: 0.3 }}>⏳  Cancellation Requested — Awaiting Approval</Text>
              </View>
            )}
            {cancelRequestStatus === 'rejected' && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 12, letterSpacing: 0.3 }}>❌  Cancellation Rejected by Staff</Text>
              </View>
            )}

            {/* PENDING order — waiter must request cancel, cashier/admin direct cancel */}
            {activeOrder.status === 'pending' && role === 'waiter' && onRequestCancel && !cancelRequestStatus && (
              <TouchableOpacity
                style={{ height: 48, borderRadius: 12, backgroundColor: '#f59e0b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={onRequestCancel}
                disabled={placingOrder}
                activeOpacity={0.8}
              >
                <Ban size={12} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>REQUEST CANCELLATION</Text>
              </TouchableOpacity>
            )}
            {activeOrder.status === 'pending' && (role === 'cashier' || role === 'admin') && onCancelOrder && !cancelRequestStatus && (
              <TouchableOpacity
                style={{ height: 48, borderRadius: 12, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={onCancelOrder}
                disabled={placingOrder}
                activeOpacity={0.8}
              >
                <Ban size={12} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>CANCEL ORDER</Text>
              </TouchableOpacity>
            )}

            {/* PREPARING order — waiter/cashier can only request cancel, admin can cancel directly */}
            {activeOrder.status === 'preparing' && role !== 'admin' && onRequestCancel && !cancelRequestStatus && (
              <TouchableOpacity
                style={{ height: 48, borderRadius: 12, backgroundColor: '#f59e0b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={onRequestCancel}
                disabled={placingOrder}
                activeOpacity={0.8}
              >
                <Ban size={12} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>REQUEST CANCELLATION</Text>
              </TouchableOpacity>
            )}
            {activeOrder.status === 'preparing' && role === 'admin' && onCancelOrder && (
              <TouchableOpacity
                style={{ height: 48, borderRadius: 12, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={onCancelOrder}
                disabled={placingOrder}
                activeOpacity={0.8}
              >
                <Ban size={12} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>CANCEL ORDER (Stock Refund)</Text>
              </TouchableOpacity>
            )}

            {/* READY order — waiter/cashier request, admin direct cancel */}
            {activeOrder.status === 'ready' && role !== 'admin' && onRequestCancel && !cancelRequestStatus && (
              <TouchableOpacity
                style={{ height: 48, borderRadius: 12, backgroundColor: '#f59e0b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={onRequestCancel}
                disabled={placingOrder}
                activeOpacity={0.8}
              >
                <Ban size={12} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>REQUEST CANCEL (→ Admin)</Text>
              </TouchableOpacity>
            )}
            {activeOrder.status === 'ready' && role === 'admin' && onCancelOrder && (
              <TouchableOpacity
                style={{ height: 48, borderRadius: 12, backgroundColor: '#7f1d1d', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                onPress={onCancelOrder}
                disabled={placingOrder}
                activeOpacity={0.8}
              >
                <Ban size={12} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>ADMIN FORCE-CANCEL</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartDrawer: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 10,
  },
  cartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  clearAllText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ef4444',
  },
  cartItemsScroll: {
    flex: 1,
    marginBottom: 10,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 8,
  },
  emptyCartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyCartText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  emptyCartSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  cartItemPrice: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
  rightControlRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ea580c',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    padding: 1.5,
  },
  qtyBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    paddingHorizontal: 6,
  },
  remarksGroup: {
    marginBottom: 14,
  },
  remarksLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  remarksLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  remarksInput: {
    height: 64,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    backgroundColor: '#f8fafc',
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderColor: '#f1f5f9',
    paddingTop: 14,
  },
  totalBlock: {
    flex: 1.2,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 2,
  },
  submitOrderBtn: {
    flex: 1.8,
    flexDirection: 'row',
    backgroundColor: '#ea580c',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitOrderBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitOrderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  requestBillBtn: {
    backgroundColor: '#0284c7',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  requestBillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sentContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sentHeaderTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  newHeaderTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 6,
  },
  sentItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sentItemText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  sentItemSubtotal: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '800',
  },
  sentDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 6,
  },
  itemNotesInput: {
    fontSize: 10,
    color: '#334155',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    fontWeight: '600',
    height: 26,
  },
});

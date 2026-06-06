import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Search, Plus, Minus, Edit3, DollarSign, Sparkles } from 'lucide-react-native';
import LogoLoader from './LogoLoader';

interface MenuItem {
  id: any;
  name: string;
  price: number;
  category_name?: string;
  image?: string;
}

interface CartItem extends MenuItem {
  qty: number;
  notes?: string;
}

interface MenuSectionProps {
  loadingMenu: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  filteredItems: MenuItem[];
  addToCart: (item: MenuItem) => void;
  cartItems: CartItem[];
  updateQty: (id: any, delta: number) => void;
  showCustomForm: boolean;
  setShowCustomForm: (show: boolean) => void;
  customName: string;
  setCustomName: (name: string) => void;
  customPrice: string;
  setCustomPrice: (price: string) => void;
  addCustomItem: () => void;
}

export default function MenuSection({
  loadingMenu,
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredItems,
  addToCart,
  cartItems,
  updateQty,
  showCustomForm,
  setShowCustomForm,
  customName,
  setCustomName,
  customPrice,
  setCustomPrice,
  addCustomItem
}: MenuSectionProps) {
  return (
    <ScrollView style={styles.menuColumn} nestedScrollEnabled={true}>
      {/* Menu Search Bar */}
      <View style={styles.searchBarWrapper}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          placeholder="Search menu catalogue..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Category selection */}
      <View style={styles.categoryScrollerContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, selectedCategory === cat && styles.activeCatPill]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catText, selectedCategory === cat && styles.activeCatText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu item list */}
      {loadingMenu ? (
        <View style={styles.centerLoading}>
          <LogoLoader />
        </View>
      ) : (
        <View style={styles.menuList}>
          {filteredItems.map(item => {
            const cartItem = cartItems.find(i => i.id === item.id);
            const qty = cartItem ? cartItem.qty : 0;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItemCard, qty > 0 && styles.menuItemCardActive]}
                onPress={() => qty === 0 && addToCart(item)}
                activeOpacity={qty > 0 ? 1 : 0.7}
              >
                {/* Item Image or Category Initial Placeholder */}
                <View style={styles.menuItemImageContainer}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.menuItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.menuItemPlaceholderText}>
                      {(item.category_name || 'U').substring(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  <Text style={styles.menuItemCat}>{item.category_name || 'UNCATEGORIZED'}</Text>
                </View>
                
                <View style={styles.priceAddRow}>
                  <Text style={styles.menuItemPrice}>Rs. {item.price}</Text>
                  
                  {qty > 0 ? (
                    <View style={styles.inlineQtySelector}>
                      <TouchableOpacity 
                        style={styles.inlineQtyBtn} 
                        onPress={() => updateQty(item.id, -1)}
                      >
                        <Minus size={10} color="#ea580c" />
                      </TouchableOpacity>
                      <Text style={styles.inlineQtyText}>{qty}</Text>
                      <TouchableOpacity 
                        style={styles.inlineQtyBtn} 
                        onPress={() => updateQty(item.id, 1)}
                      >
                        <Plus size={10} color="#ea580c" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.addBtnCircle} onPress={() => addToCart(item)}>
                      <Plus size={12} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Custom Item Entry Toggle */}
      <TouchableOpacity 
        style={[styles.customToggleBtn, showCustomForm && styles.customToggleBtnActive]}
        onPress={() => setShowCustomForm(!showCustomForm)}
      >
        <Sparkles size={14} color={showCustomForm ? '#ffffff' : '#f97316'} style={{ marginRight: 6 }} />
        <Text style={[styles.customToggleText, showCustomForm && styles.customToggleTextActive]}>
          {showCustomForm ? 'CLOSE CUSTOM ENTRY' : 'ADD CUSTOM DISH TO CART'}
        </Text>
      </TouchableOpacity>

      {showCustomForm && (
        <View style={styles.customForm}>
          <View style={styles.formHeader}>
            <Edit3 size={16} color="#f97316" />
            <Text style={styles.formTitle}>Custom Dish Details</Text>
          </View>

          <Text style={styles.fieldLabel}>DISH NAME</Text>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="e.g. Special Mutton Handi Half"
              placeholderTextColor="#94a3b8"
              value={customName}
              onChangeText={setCustomName}
              style={styles.formInput}
            />
          </View>

          <Text style={styles.fieldLabel}>PRICE (RS.)</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>Rs.</Text>
            <TextInput
              placeholder="e.g. 1500"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={customPrice}
              onChangeText={setCustomPrice}
              style={[styles.formInput, { paddingLeft: 4 }]}
            />
          </View>

          <TouchableOpacity style={styles.formAddBtn} onPress={addCustomItem}>
            <Plus size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.formAddBtnText}>INSERT INTO ORDER</Text>
          </TouchableOpacity>
        </View>
      )}

      
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  menuColumn: {
    flex: 1.25,
    padding: 12,
    borderRightWidth: 1.2,
    borderColor: '#e2e8f0',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  categoryScrollerContainer: {
    height: 38,
    marginBottom: 12,
  },
  catPill: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeCatPill: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  catText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase',
  },
  activeCatText: {
    color: '#ffffff',
  },
  centerLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  menuList: {
    gap: 8,
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  menuItemCardActive: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  menuItemImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
  },
  menuItemPlaceholderText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ea580c',
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  menuItemCat: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  priceAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f97316',
  },
  addBtnCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineQtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ea580c',
    borderRadius: 8,
    padding: 2,
  },
  inlineQtyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  inlineQtyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    paddingHorizontal: 4,
  },
  customToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#ffedd5',
    borderRadius: 12,
    marginTop: 12,
  },
  customToggleBtnActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  customToggleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  customToggleTextActive: {
    color: '#ffffff',
  },
  customForm: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginRight: 2,
  },
  formInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  formAddBtn: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 6,
  },
  formAddBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

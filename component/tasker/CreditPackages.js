// Place this right after the imports (before the main component)
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';


const C = {
  bg:           '#F8FAFF',        // very light blue-grey
  surface:      '#FFFFFF',
  surfaceAlt:   '#F1F4F9',
  border:       '#E4E8EE',
  borderLight:  '#E2E8F0',
  primary:      '#1E3A6E',  
  accent:       '#1E3A6E',       // deep indigo
  primaryLight: '#DDE7F5',
  primaryDark:  '#14274A',
  primaryGlow:  '#EBF5FF',
  gold:         '#D49B3F',
  goldLight:    '#FCF3E1',
  emerald:      '#0F766E',
  emeraldBg:    '#D1FAE5',
  coral:        '#DC2626',
  coralBg:      '#FEE2E2',
  amber:        '#F59E0B',
  textPrimary:  '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  white:        '#FFFFFF',
};



const CREDIT_PACKAGES = [
  { id: 'basic',    name: 'Basic',    credits: 12, price: 30 },
  { id: 'standard', name: 'Standard', credits: 24, price: 50 },
  { id: 'premium',  name: 'Premium',  credits: 36, price: 70 },
  { id: 'business', name: 'Business', credits: 50, price: 120 },
];

export const CreditSheet = ({ visible, onClose, onSelect, purchasing }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>Top Up Credits</Text>
        <Text style={sheetStyles.subtitle}>Select a package to continue</Text>
        
        {CREDIT_PACKAGES.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={sheetStyles.packageCard}
            onPress={() => onSelect(pkg)}
            disabled={purchasing}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.packageName}>{pkg.name}</Text>
              <Text style={sheetStyles.packageCredits}>{pkg.credits} Credits</Text>
            </View>
            <View style={sheetStyles.priceTag}>
              <Text style={sheetStyles.priceText}>GH₵ {pkg.price}</Text>
              {purchasing && (
                <ActivityIndicator style={{ marginLeft: 8 }} size="small" color={C.accent} />
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose} disabled={purchasing}>
          <Text style={sheetStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 20 },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  packageName: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  packageCredits: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  priceTag: { flexDirection: 'row', alignItems: 'center' },
  priceText: { fontSize: 16, fontWeight: '700', color: C.accent },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 15, color: C.textMuted, fontWeight: '600' },
});
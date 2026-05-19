// component/tasker/ScamAlertModal.js
//
// Previously this component imported `styles` from TaskDetailsScreen, which
// caused "Cannot read property 'scamAlertOverlay' of undefined" whenever
// TaskDetailsScreen was refactored. This version owns its own styles.

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TIPS = [
  {
    icon: 'cash-outline',
    text: 'Never pay any upfront fees or deposits to secure a task. Legitimate clients do not ask for money before work begins.',
  },
  {
    icon: 'lock-closed-outline',
    text: 'Do not share your personal banking details, mobile money PIN, or passwords with anyone on the platform.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    text: 'Be cautious of clients who move conversations off-platform or ask you to use untraceable payment methods.',
  },
  {
    icon: 'shield-checkmark-outline',
    text: 'All legitimate payments go through the Workaflow platform. If something feels off, report it immediately.',
  },
  {
    icon: 'eye-outline',
    text: 'Verify the job details carefully. Unusually high pay for simple tasks can be a red flag for scam activity.',
  },
];

export const ScamAlertModal = ({ visible, onClose }) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={s.overlay}>
      <View style={s.sheet}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#F59E0B" />
          </View>
          <View style={s.headerText}>
            <Text style={s.title}>Stay Safe on Workaflow</Text>
            <Text style={s.subtitle}>Your safety is our top priority</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Warning banner */}
        <View style={s.warningBanner}>
          <Ionicons name="warning" size={18} color="#92400E" />
          <Text style={s.warningText}>
            Never send money or pay fees to anyone before completing a job.
          </Text>
        </View>

        {/* Tips list */}
        <ScrollView
          style={s.tipsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {TIPS.map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={s.tipIconWrap}>
                <Ionicons name={tip.icon} size={18} color="#1A56DB" />
              </View>
              <Text style={s.tipText}>{tip.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* CTA */}
        <View style={s.footer}>
          <TouchableOpacity style={s.reportLink} onPress={onClose}>
            <Ionicons name="flag-outline" size={16} color="#DC2626" />
            <Text style={s.reportLinkText}>Report a suspicious listing</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.closeButton} onPress={onClose}>
            <Text style={s.closeButtonText}>Got it, I understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E8EE',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 19,
  },
  tipsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    paddingTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  reportLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  closeButton: {
    backgroundColor: '#1A56DB',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
import { StyleSheet, Dimensions,Platform } from 'react-native';

const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');



export const styles = StyleSheet.create({
 
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
 modalContent: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  maxHeight: height * 0.9,    // ← Use maxHeight instead of fixed height
  flex: 1,                    // ← Allow it to grow
  justifyContent: 'space-between',
},

scrollContent: {
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 20,          // Extra bottom padding for breathing room
},

modalActions: {
  flexDirection: 'row',
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderTopWidth: 1,
  borderTopColor: '#F3F4F6',
  backgroundColor: '#FFFFFF', // Ensure it's not transparent
  gap: 12,
  bottom:28,
},
modalContainer: {
  flex: 1, // This will make the content area flexible
  
},
modalScrollView: {
  flex: 1,
},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalBackButton: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },

  paymentTypeInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: '#F3F4F6',
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 12,
  minHeight: 52,
},
paymentTypeIcon: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#EEF2FF',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},
paymentTypeText: {
  fontSize: 16,
  color: '#111827',
  fontWeight: '500',
  flex: 1,
},
onlyOptionBadge: {
  backgroundColor: '#6366F1',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
onlyOptionText: {
  fontSize: 12,
  color: '#FFFFFF',
  fontWeight: '600',
},
paymentTypeDescription: {
  fontSize: 14,
  color: '#6B7280',
  marginTop: 8,
  marginLeft: 4,
},

  // Form Styles
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 52,
  },
  typeSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typePreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typePreviewText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },

  // Provider Selector
  providerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 52,
  },
  providerSelectorEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderStyle: 'dashed',
    minHeight: 52,
  },
  providerSelectorEmptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  providerPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerPreviewInfo: {
    flex: 1,
  },
  providerPreviewName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  providerPreviewDescription: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Input Fields
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: 16,
  },
  formInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    minHeight: 52,
  },
  inputHelper: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 4,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 8,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    marginLeft: 12,
    lineHeight: 20,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Dropdown Styles
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.6,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownList: {
    padding: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownProviderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  dropdownItemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
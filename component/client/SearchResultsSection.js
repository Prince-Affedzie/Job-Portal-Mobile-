import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchResultsSection = ({
  primaryResults,
  secondaryResults,
  loading,
  error,
  hasSearched,
  searchQuery,
  location,
  isSelectionMode,
  selectedTaskers,
  onToggleTaskerSelection,
  onViewProfile,
  onSelectAll,
  onClearAll,
  renderTaskerCard,
  renderTaskerSelectionCard
}) => {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Finding taskers near you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Search Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!hasSearched) {
    return null;
  }

  const sections = [];

  // Primary Results Section
  if (primaryResults.length > 0) {
    sections.push({
      title: `Best Matches for "${searchQuery}"`,
      subtitle: `${primaryResults.length} tasker${primaryResults.length !== 1 ? 's' : ''} found`,
      data: primaryResults,
      type: 'primary',
      key: 'primary-section'
    });
  }

  // Secondary Suggestions Section
  if (secondaryResults.length > 0) {
    sections.push({
      title: 'Other Taskers You Might Like',
      subtitle: 'Taskers nearby with similar skills',
      data: showAllSuggestions ? secondaryResults : secondaryResults.slice(0, 4),
      type: 'secondary',
      key: 'secondary-section'
    });
  }

  const renderSectionHeader = ({ section }) => {
    if (section.type === 'secondary' && section.data.length === 0) return null;

    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
          </View>
          {section.type === 'secondary' && secondaryResults.length > 4 && (
            <TouchableOpacity 
              onPress={() => setShowAllSuggestions(!showAllSuggestions)}
              style={styles.toggleSuggestionsButton}
            >
              <Text style={styles.toggleSuggestionsText}>
                {showAllSuggestions ? 'Show Less' : 'Show More'}
              </Text>
              <Ionicons 
                name={showAllSuggestions ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#6366F1" 
              />
            </TouchableOpacity>
          )}
        </View>
        
        {section.type === 'primary' && primaryResults.length > 0 && isSelectionMode && (
          <View style={styles.selectionInfoContainer}>
            <View style={styles.selectionStats}>
              <Text style={styles.selectionStatsText}>
                <Text style={styles.selectionCount}>{selectedTaskers.length}</Text> of {primaryResults.length} selected
              </Text>
              <View style={styles.selectionActions}>
                <TouchableOpacity onPress={onSelectAll} style={styles.selectionActionButton}>
                  <Ionicons name="checkmark-done" size={16} color="#6366F1" />
                  <Text style={styles.selectionActionText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClearAll} style={styles.selectionActionButton}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                  <Text style={[styles.selectionActionText, { color: '#EF4444' }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.selectionHint}>
              Invite multiple professionals to submit proposals and get competitive offers
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item, section }) => {
    if (isSelectionMode && section.type === 'primary') {
      return renderTaskerSelectionCard(item);
    }
    return renderTaskerCard(item);
  };

  if (primaryResults.length === 0 && secondaryResults.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>No exact matches found</Text>
        <Text style={styles.emptyText}>
          We couldn't find taskers exactly matching "{searchQuery}"
        </Text>
        <Text style={styles.emptySubtext}>
          Try different search terms or check our suggestions above
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
        ListFooterComponent={() => (
          secondaryResults.length > 0 ? (
            <View style={styles.suggestionsInfo}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.suggestionsInfoText}>
                Suggestions are based on location, skills, and popularity
              </Text>
            </View>
          ) : null
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleSuggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    gap: 4,
  },
  toggleSuggestionsText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  selectionInfoContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginTop: 8,
  },
  selectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionStatsText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectionActionText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  selectionHint: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  itemSeparator: {
    height: 12,
  },
  sectionSeparator: {
    height: 24,
  },
  suggestionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    gap: 8,
  },
  suggestionsInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 100,
  },
});

export default SearchResultsSection;
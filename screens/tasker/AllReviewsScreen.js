// screens/tasker/AllReviewsScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  StatusBar,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from "../../component/tasker/Header";

const { width } = Dimensions.get('window');

const AllReviewsScreen = ({ route, navigation }) => {
  const { reviews, userName, averageRating, totalReviews } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'highest', 'lowest'
  const [filterRating, setFilterRating] = useState(0); // 0 = all, 1-5 = specific rating

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(review => 
        review.feedback?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.ratedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by rating
    if (filterRating > 0) {
      filtered = filtered.filter(review => review.rating === filterRating);
    }

    // Sort reviews
    switch (sortBy) {
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return filtered;
  }, [reviews, searchQuery, sortBy, filterRating]);

  const renderStars = (rating, size = 16) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.ratingStars}>
        {[...Array(fullStars)].map((_, index) => (
          <Ionicons
            key={`full-${index}`}
            name="star"
            size={size}
            color="#F59E0B"
          />
        ))}
        {hasHalfStar && (
          <Ionicons
            key="half"
            name="star-half"
            size={size}
            color="#F59E0B"
          />
        )}
        {[...Array(emptyStars)].map((_, index) => (
          <Ionicons
            key={`empty-${index}`}
            name="star-outline"
            size={size}
            color="#F59E0B"
          />
        ))}
      </View>
    );
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10B981';
    if (rating >= 4.0) return '#22C55E';
    if (rating >= 3.0) return '#F59E0B';
    return '#EF4444';
  };

  const RatingSummary = () => (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6']}
      style={styles.ratingSummary}
    >
      <View style={styles.ratingOverview}>
        <View style={styles.ratingNumberContainer}>
          <Text style={styles.ratingNumber}>{averageRating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.ratingOutOf}>/5</Text>
        </View>
        {renderStars(averageRating || 0, 20)}
        <Text style={styles.totalReviews}>
          {totalReviews || reviews.length} review{(totalReviews || reviews.length) !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Rating Distribution */}
      <View style={styles.ratingDistribution}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = reviews.filter(review => review.rating === stars).length;
          const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
          
          return (
            <TouchableOpacity
              key={stars}
              style={[
                styles.ratingBarContainer,
                filterRating === stars && styles.ratingBarContainerActive
              ]}
              onPress={() => setFilterRating(filterRating === stars ? 0 : stars)}
            >
              <View style={styles.ratingBarLabel}>
                <Text style={styles.ratingBarText}>{stars}</Text>
                <Ionicons name="star" size={12} color="#F59E0B" />
              </View>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingBarFill,
                    { 
                      width: `${percentage}%`,
                      backgroundColor: getRatingColor(stars)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ratingBarCount}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );

  const ReviewItem = ({ review }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            {review.ratedBy?.profileImage ? (
              <Image
                source={{ uri: review.ratedBy.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.reviewerInitial}>
                {review.ratedBy?.name?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
            )}
          </View>
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>
              {review.ratedBy?.name || 'Client'}
            </Text>
            <Text style={styles.reviewerRole}>
              {review.ratedBy?.role || 'Client'}
            </Text>
          </View>
        </View>
        
        <View style={styles.ratingBadge}>
          {renderStars(review.rating, 14)}
          <Text style={styles.ratingBadgeText}>{review.rating}.0</Text>
        </View>
      </View>
      
      <Text style={styles.reviewDate}>
        {moment(review.createdAt).format('MMM D, YYYY')}
      </Text>
      
      {review.feedback ? (
        <Text style={styles.reviewComment}>{review.feedback}</Text>
      ) : (
        <Text style={styles.noComment}>No comment provided</Text>
      )}
      
      {/* Review Meta */}
      <View style={styles.reviewMeta}>
        <View style={styles.reviewTask}>
          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
          <Text style={styles.reviewTaskText}>Task Completed</Text>
        </View>
      </View>
    </View>
  );

  const FilterBar = () => (
    <View style={styles.filterBar}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search reviews..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Sort Dropdown */}
      <TouchableOpacity 
        style={styles.sortButton}
        onPress={() => {
          // Simple sort toggle
          const sortOptions = ['recent', 'highest', 'lowest'];
          const currentIndex = sortOptions.indexOf(sortBy);
          const nextIndex = (currentIndex + 1) % sortOptions.length;
          setSortBy(sortOptions[nextIndex]);
        }}
      >
        <Text style={styles.sortButtonText}>
          Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6366F1" />
      </TouchableOpacity>
    </View>
  );

  const ResultsInfo = () => (
    <View style={styles.resultsInfo}>
      <Text style={styles.resultsText}>
        Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
        {filterRating > 0 && ` • ${filterRating}-star reviews`}
        {searchQuery && ` • "${searchQuery}"`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      <Header 
        title="All Reviews" 
        showBackButton={true}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Make filter bar sticky
      >
        {/* Rating Summary */}
        <RatingSummary />
        
        {/* Filter Bar */}
        <View style={styles.stickyHeader}>
          <FilterBar />
          <ResultsInfo />
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {filteredAndSortedReviews.length > 0 ? (
            filteredAndSortedReviews.map((review, index) => (
              <ReviewItem key={index} review={review} />
            ))
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={64} color="#D1D5DB" />
              <Text style={styles.noResultsTitle}>No reviews found</Text>
              <Text style={styles.noResultsText}>
                {searchQuery || filterRating > 0 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No reviews available'
                }
              </Text>
              {(searchQuery || filterRating > 0) && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setFilterRating(0);
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: '#FFFFFF',
  },
  ratingSummary: {
    borderRadius:12,
    paddingHorizontal:20,
    marginHorizontal:10,
   
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingOutOf: {
    fontSize: 18,
    color: '#E5E7EB',
    fontWeight: '600',
    marginLeft: 2,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  ratingDistribution: {
    width: '100%',
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  ratingBarContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 30,
  },
  ratingBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    marginRight: 4,
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  resultsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewsList: {
    padding: 16,
  },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  reviewerInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  reviewerRole: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 12,
  },
  reviewComment: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  noComment: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewTask: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reviewTaskText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '500',
    marginLeft: 4,
  },
  noResults: {
    alignItems: 'center',
    padding: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersButton: {
    marginTop: 16,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});

export default AllReviewsScreen;
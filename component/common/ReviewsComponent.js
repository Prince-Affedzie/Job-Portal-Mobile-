import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

const { width } = Dimensions.get('window');

const ReviewsComponent = ({ reviews, averageRating, totalReviews, onViewAll }) => {
  const renderStars = (rating, size = 14) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    console.log(reviews)

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
    <View style={styles.ratingSummary}>
      <View style={styles.ratingOverview}>
        <View style={styles.ratingNumberContainer}>
          <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.ratingOutOf}>/5</Text>
        </View>
        {renderStars(averageRating, 18)}
        <Text style={styles.totalReviews}>
          {totalReviews} review{totalReviews !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {/* Rating Distribution */}
      <View style={styles.ratingDistribution}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = reviews.filter(review => review.rating === stars).length;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          
          return (
            <View key={stars} style={styles.ratingBarContainer}>
              <View style={styles.ratingBarLabel}>
                <Text style={styles.ratingBarText}>{stars}</Text>
                <Ionicons name="star" size={12} color="#F59E0B" />
              </View>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingBarFill,
                    { width: `${percentage}%`, backgroundColor: getRatingColor(stars) }
                  ]} 
                />
              </View>
              <Text style={styles.ratingBarCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const ReviewItem = ({ review }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerInitial}>
              {review.ratedBy?.name?.charAt(0)?.toUpperCase() || 'C'}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>
              {review.ratedBy?.name || 'Client'}
            </Text>
            {renderStars(review.rating)}
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {moment(review.createdAt).fromNow()}
        </Text>
      </View>
      
      {review.feedback && (
        <Text style={styles.reviewComment}>{review.feedback}</Text>
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

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyReviews}>
        <Ionicons name="star-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyReviewsTitle}>No Reviews Yet</Text>
        <Text style={styles.emptyReviewsText}>
          You haven't received any reviews from clients yet.
        </Text>
      </View>
    );
  }

  const displayedReviews = reviews.slice(0, 3);

  return (
    <View style={styles.container}>
      <RatingSummary />
      
      <View style={styles.reviewsList}>
        <Text style={styles.reviewsTitle}>Recent Reviews</Text>
        {displayedReviews.map((review, index) => (
          <ReviewItem key={index} review={review} />
        ))}
      </View>
      
      {reviews.length > 3 && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllButtonText}>
            View All {totalReviews} Reviews
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6366F1" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  ratingSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  ratingOutOf: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 2,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  ratingDistribution: {
    width: '100%',
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 30,
  },
  ratingBarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginRight: 2,
  },
  ratingBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    width: 20,
    textAlign: 'right',
  },
  reviewsList: {
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 4,
  },
  emptyReviews: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  emptyReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReviewsComponent;
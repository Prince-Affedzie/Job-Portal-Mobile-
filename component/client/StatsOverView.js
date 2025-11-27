// component/tasker/StatsOverview.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const StatsOverview = ({ stats }) => (
  <View style={styles.statsSection}>
    <View style={styles.statsHeader}>
      <Text style={styles.statsTitle}>Tasks Overview</Text>
      <Text style={styles.statsSubtitle}>Your Tasks Performance</Text>
    </View>
    
    <View style={styles.statsGrid}>
      <LinearGradient
        colors={['#EFF6FF', '#DBEAFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statCard, styles.statCardPrimary]}
      >
        <View style={styles.statTopRow}>
          <View style={[styles.statIconContainer, styles.statIconPrimary]}>
            <Ionicons name="layers-outline" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <Text style={styles.statLabel}>Total Tasks</Text>
      </LinearGradient>

      <LinearGradient
        colors={['#F0FDF4', '#DCFCE7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statCard, styles.statCardSuccess]}
      >
        <View style={styles.statTopRow}>
          <View style={[styles.statIconContainer, styles.statIconSuccess]}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          </View>
          <Text style={styles.statValue}>{stats.completed}</Text>
        </View>
        <Text style={styles.statLabel}>Completed</Text>
        <View style={styles.statProgress}>
          <Text style={styles.statPercentage}>
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </Text>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={['#FFFBEB', '#FEFCE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statCard, styles.statCardWarning]}
      >
        <View style={styles.statTopRow}>
          <View style={[styles.statIconContainer, styles.statIconWarning]}>
            <Ionicons name="time-outline" size={18} color="#CA8A04" />
          </View>
          <Text style={styles.statValue}>{stats.inProgress}</Text>
        </View>
        <Text style={styles.statLabel}>In Progress</Text>
        <View style={styles.statProgress}>
          <Text style={styles.statPercentage}>
            {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
          </Text>
        </View>
      </LinearGradient>

      <View style={[styles.statCard, styles.statCardInfo]}>
        <View style={styles.statTopRow}>
          <View style={[styles.statIconContainer, styles.statIconInfo]}>
            <Ionicons name="trending-up" size={18} color="#7C3AED" />
          </View>
          <Text style={styles.statValue}>{stats.applicants}</Text>
        </View>
        <Text style={styles.statLabel}>Total Responses</Text>
        <View style={styles.statProgress}>
          <View style={styles.rateTrend}>
            <Ionicons 
              name={stats.applicantsPerTask >= 2 ? "arrow-up" : "arrow-down"} 
              size={12} 
              color={stats.applicantsPerTask >= 2 ? "#16A34A" : "#DC2626"} 
            />
            <Text style={[
              styles.trendText,
              { color: stats.applicantsPerTask >= 2 ? "#16A34A" : "#DC2626" }
            ]}>
              {stats.applicantsPerTask >= 2 ? "Good" : "Low"} interest
            </Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  statsSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#CA8A04',
  },
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconPrimary: {
    backgroundColor: '#EEF2FF',
  },
  statIconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statIconWarning: {
    backgroundColor: '#FEF9C3',
  },
  statIconInfo: {
    backgroundColor: '#F3E8FF',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'right',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPercentage: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    minWidth: 30,
    textAlign: 'right',
  },
  rateTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default StatsOverview;
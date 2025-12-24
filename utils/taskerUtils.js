import { formatTaskerLocation, formatDistance } from './locationUtils';

export const getServiceBadgeColor = (searchQuery) => {
  const service = searchQuery.toLowerCase();
  if (service.includes('clean') || service.includes('home')) return '#10B981';
  if (service.includes('tech') || service.includes('digital')) return '#6366F1';
  if (service.includes('design') || service.includes('creative')) return '#8B5CF6';
  if (service.includes('repair') || service.includes('install')) return '#F59E0B';
  return '#3B82F6';
};

export const formatTaskerRate = (tasker) => {
  if (tasker.hourlyRate) return `GHS ${tasker.hourlyRate}/hr`;
  if (tasker.minBudget && tasker.maxBudget) return `GHS ${tasker.minBudget}-${tasker.maxBudget}`;
  if (tasker.budget) return `GHS ${tasker.budget}`;
  return 'Available';
};

export const getPrimarySkill = (tasker) => {
  if (tasker.skills?.length > 0) return tasker.skills[0];
  if (tasker.category) return tasker.category;
  return 'Skilled Professional';
};

export const getTaskerStats = (tasker) => ({
  completedJobs: tasker.completedJobs > 0 ? `${tasker.completedJobs} jobs` : null,
  responseRate: tasker.responseRate ? `${tasker.responseRate}% response` : null,
  onTimeRate: tasker.onTimeRate ? `${tasker.onTimeRate}% on time` : null,
});

export const taskerCardUtils = {
  getServiceBadgeColor,
  formatTaskerRate,
  getPrimarySkill,
  getTaskerStats,
  formatTaskerLocation,
  formatDistance,
};
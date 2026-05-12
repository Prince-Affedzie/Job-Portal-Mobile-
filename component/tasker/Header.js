import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from "../../context/NotificationContext";
import { navigate, goBack } from '../../services/navigationService';
import { useNavigation } from "@react-navigation/native";

const Header = ({ 
  title, 
  showBackButton = false, 
  onBackPress, 
  rightIcon, 
  onRightPress,
  rightComponent,
  showProfile = false,
  showNotifications = true,
  backgroundColor = '#FFFFFF',        // now light
  gradient = false,                   // gradient off by default
  customContent,
}) => {
  const { user } = React.useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { notifications } = React.useContext(NotificationContext);
  const unreadNotifications = notifications.filter(n => !n.read);
  const notificationCount = unreadNotifications.length > 0 ? unreadNotifications.length : 0;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      goBack();
    }
  };

  const navigation = useNavigation();

  const handleProfilePress = () => {
    navigate('ProfileTab');
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  // If gradient is used (rare in light theme), provide a subtle light gradient
  const HeaderBackground = gradient ? LinearGradient : View;
  const backgroundProps = gradient 
    ? { colors: ['#FFFFFF', '#F8FAFF'] }
    : { style: [styles.background, { backgroundColor }] };

  const useLeftLayout = !!rightComponent;

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={backgroundColor} 
        translucent={false} 
      />
      <HeaderBackground 
        {...backgroundProps}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.content}>
          {/* Left Section */}
          <View style={[styles.leftSection, useLeftLayout && styles.leftSectionExpanded]}>
            {showBackButton && (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBackPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={24} color="#111827" />
              </TouchableOpacity>
            )}
            {!showBackButton && customContent && (
              <View style={styles.customContent}>
                {customContent}
              </View>
            )}
            
            {useLeftLayout && (
              <Text style={[styles.title, styles.titleLeft]} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>

          {/* Center Section - Title (only when no rightComponent) */}
          {!useLeftLayout && (
            <View style={styles.centerSection}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}

          {/* Right Section */}
          <View style={styles.rightSection}>
            {rightComponent ? (
              <View style={styles.rightComponentContainer}>
                {rightComponent}
              </View>
            ) : (
              <>
                {showNotifications && (
                  <TouchableOpacity 
                    style={styles.notificationButton} 
                    onPress={handleNotificationPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.notificationContainer}>
                      <Ionicons name="notifications-outline" size={26} color="#374151" />
                      {notificationCount > 0 && (
                        <View style={[
                          styles.notificationBadge,
                          notificationCount > 9 && styles.notificationBadgeSmall
                        ]}>
                          <Text style={styles.notificationText}>
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                
                {rightIcon && (
                  <TouchableOpacity 
                    style={styles.rightButton} 
                    onPress={onRightPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={rightIcon} size={24} color="#374151" />
                  </TouchableOpacity>
                )}
                
                {showProfile && (
                  <TouchableOpacity 
                    style={styles.profileButton} 
                    onPress={handleProfilePress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        {user?.profileImage ? (
                          <Image
                            source={{ uri: user.profileImage }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <Text style={styles.avatarText}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.onlineIndicator} />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </HeaderBackground>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  background: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 6,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 40,
  },
  leftSectionExpanded: {
    flex: 1,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rightComponentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  rightButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  notificationButton: {
    padding: 4,
    borderRadius: 10,
  },
  notificationContainer: {
    position: 'relative',
    padding: 6,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notificationBadgeSmall: {
    minWidth: 18,
    height: 18,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  titleLeft: {
    textAlign: 'left',
    flex: 1,
  },
  profileButton: {
    padding: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A56DB',   // accent blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22D3EE',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  customContent: {
    alignItems: 'flex-start',
  },
});

export default Header;
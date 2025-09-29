import React from 'react';
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
import { navigate,goBack } from '../../services/navigationService';

const Header = ({ 
  title, 
  showBackButton = false, 
  onBackPress, 
  rightIcon, 
  onRightPress,
  rightComponent,
  showProfile = true,
  backgroundColor = '#1A1F3B',
  gradient = true,
  customContent,
}) => {
  const { user } = React.useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      // Default back behavior
     goBack();
    }
  };

  const handleProfilePress = () => {
    navigate('ProfileTab');
  };

  const HeaderBackground = gradient ? LinearGradient : View;
  const backgroundProps = gradient 
    ? { colors: ['#1A1F3B', '#2D325D'] }
    : { style: [styles.background, { backgroundColor }] };

  // Determine if we should use left-aligned layout
  const useLeftLayout = !!rightComponent;

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#1A1F3B" 
        translucent={true} 
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
                <Ionicons name="chevron-back" size={24} color="#E2E8F0" />
              </TouchableOpacity>
            )}
            {!showBackButton && customContent && (
              <View style={styles.customContent}>
                {customContent}
              </View>
            )}
            
            {/* Title in left section when rightComponent exists */}
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
                {rightIcon && (
                  <TouchableOpacity 
                    style={styles.rightButton} 
                    onPress={onRightPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={rightIcon} size={24} color="#E2E8F0" />
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop:0,
    marginBottom:15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  background: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 8,
  },
  leftSection: {
    alignItems: 'flex-start',
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  rightComponentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  rightButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
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
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22D3EE',
    borderWidth: 2,
    borderColor: '#1A1F3B',
  },
  customContent: {
    alignItems: 'flex-start',
  },
});

export default Header;
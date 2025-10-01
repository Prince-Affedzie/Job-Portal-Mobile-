import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Switch,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { styles } from '../../styles/auth/ProfileScreen.Styles';

export const LocationField = ({profileData, setProfileData,editing,label, field, value, editable = false }) => (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && editable ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={(text) => setProfileData({
            ...profileData,
            location: {
              ...profileData.location,
              [field]: text
            }
          })}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#94A3B8"
        />
      ) : (
        <Text style={[styles.fieldValue, !value && styles.placeholderText]}>
          {value || `No ${label.toLowerCase()} set`}
        </Text>
      )}
    </View>
  );
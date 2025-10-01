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



export const ProfileField = ({editing, label, value, editable = false, onChange, multiline = false, placeholder = '', field = '' }) => (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing && editable ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
      ) : (
        <Text style={[styles.fieldValue, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
      )}
    </View>
  );
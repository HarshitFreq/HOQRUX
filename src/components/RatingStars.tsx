import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

interface RatingStarsProps {
  rating?: number; // 0 to 5
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showNumeric?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating = 0,
  size = 18,
  interactive = false,
  onRatingChange,
  showNumeric = false,
}) => {
  const stars = [1, 2, 3, 4, 5];

  const handleStarPress = (starIndex: number) => {
    if (!interactive || !onRatingChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Toggle full or half star
    if (rating === starIndex) {
      onRatingChange(starIndex - 0.5);
    } else if (rating === starIndex - 0.5) {
      onRatingChange(starIndex - 1);
    } else {
      onRatingChange(starIndex);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {stars.map((starIndex) => {
          const filled = rating >= starIndex;
          const half = !filled && rating >= starIndex - 0.5;

          const iconName = filled
            ? 'star'
            : half
            ? 'star-half'
            : 'star-outline';

          const iconColor = filled || half ? colors.starYellow : colors.borderLight;

          const StarComponent = interactive ? TouchableOpacity : View;

          return (
            <StarComponent
              key={starIndex}
              activeOpacity={0.7}
              onPress={() => handleStarPress(starIndex)}
              style={styles.starWrapper}
            >
              <Ionicons name={iconName} size={size} color={iconColor} />
            </StarComponent>
          );
        })}
      </View>
      {showNumeric && rating > 0 && (
        <Text style={[styles.numericText, { fontSize: size * 0.75 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starWrapper: {
    padding: 2,
  },
  numericText: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 6,
  },
});

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTracking } from '../../context/TrackingContext';
import { Watchlist, MediaItem } from '../../services/types';

export default function ListsScreen() {
  const { watchlists, createWatchlist, resolveMediaItem, refreshTracking } = useTracking();
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  // Auto-refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshTracking();
    }, [refreshTracking])
  );

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await createWatchlist(newListName.trim(), newListDesc.trim(), colors.accent);
    setNewListName('');
    setNewListDesc('');
    setModalVisible(false);
  };

  const renderListCard = (list: Watchlist) => {
    const posterItems = list.titleIds
      .map((id) => resolveMediaItem(id))
      .filter((m): m is MediaItem => Boolean(m))
      .slice(0, 5);

    return (
      <TouchableOpacity
        key={list.id}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/list/[id]', params: { id: list.id } })}
        style={styles.listCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWithDot}>
            <View
              style={[
                styles.accentIndicator,
                { backgroundColor: list.accentColor || colors.accent },
              ]}
            />
            <Text style={styles.listTitle}>{list.name.toUpperCase()}</Text>
          </View>
          <Text style={styles.itemCountBadge}>
            {list.titleIds.length} {list.titleIds.length === 1 ? 'TITLE' : 'TITLES'}
          </Text>
        </View>

        {list.description ? (
          <Text style={styles.listDesc} numberOfLines={2}>
            {list.description}
          </Text>
        ) : null}

        {/* Minimal Poster Strip */}
        {posterItems.length > 0 ? (
          <View style={styles.posterRow}>
            {posterItems.map((item, idx) => (
              <View key={`${item.id}-${idx}`} style={styles.posterItem}>
                <Image
                  source={{ uri: item.posterPath }}
                  style={styles.collagePoster}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCassetteBox}>
            <Text style={styles.emptyPlaceholderText}>[ EMPTY QUEUE // TAP TO VIEW & ADD ]</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimal Clean Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WATCHLISTS</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>+ NEW</Text>
          </TouchableOpacity>
        </View>

        {/* System Lists */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>COLLECTIONS</Text>
        </View>
        {watchlists.filter((l) => !l.isCustom).map((l) => renderListCard(l))}

        {/* Custom Lists */}
        {watchlists.some((l) => l.isCustom) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>CUSTOM LISTS</Text>
            </View>
            {watchlists.filter((l) => l.isCustom).map((l) => renderListCard(l))}
          </>
        )}

        {/* Create Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>NEW WATCHLIST</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="List title (e.g. Noir, Weekend Binge)"
                placeholderTextColor={colors.textMuted}
                value={newListName}
                onChangeText={setNewListName}
              />

              <TextInput
                style={[styles.modalInput, styles.modalDescInput]}
                placeholder="Optional description"
                placeholderTextColor={colors.textMuted}
                value={newListDesc}
                onChangeText={setNewListDesc}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateList}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>CREATE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  createButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  createButtonText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  listTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  itemCountBadge: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  listDesc: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  posterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  posterItem: {
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  collagePoster: {
    width: 52,
    height: 78,
  },
  emptyCassetteBox: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: 2,
    marginTop: 4,
  },
  emptyPlaceholderText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  modalTitle: {
    fontFamily: typography.fontBlack,
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    color: colors.textPrimary,
    fontFamily: typography.fontMedium,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalDescInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontFamily: typography.fontBold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  saveBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 2,
  },
  saveBtnText: {
    fontFamily: typography.fontBlack,
    color: '#050507',
    fontSize: 11,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
});

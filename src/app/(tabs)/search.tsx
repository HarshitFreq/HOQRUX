import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { mediaEngine } from '../../services/api/mediaEngine';
import { MediaItem } from '../../services/types';
import { PosterCard } from '../../components/PosterCard';
import { typoCorrectionService } from '../../services/typoCorrection';
import { useTracking } from '../../context/TrackingContext';
import {
  genreCatalogueService,
  GenreFormat,
  GenreSort,
} from '../../services/genreCatalogueService';

const FORMAT_OPTIONS: { id: GenreFormat; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'movie', label: 'CINEMA' },
  { id: 'tv', label: 'SERIES' },
  { id: 'anime', label: 'ANIME' },
];

const SORT_OPTIONS: { id: GenreSort; label: string }[] = [
  { id: 'popularity.desc', label: 'POPULAR' },
  { id: 'vote_average.desc', label: 'TOP RATED' },
  { id: 'primary_release_date.desc', label: 'NEWEST' },
];

export default function ExploreScreen() {
  const { cacheMediaItem } = useTracking();

  // Universal Search State
  const [query, setQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);

  // API-Driven Genre Catalogue State
  const genreList = useMemo(() => genreCatalogueService.getGenreList(), []);
  const [selectedGenreId, setSelectedGenreId] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<GenreFormat>('all');
  const [selectedSort, setSelectedSort] = useState<GenreSort>('popularity.desc');
  const [genreItems, setGenreItems] = useState<MediaItem[]>([]);
  const [genrePage, setGenrePage] = useState(1);
  const [isLoadingGenre, setIsLoadingGenre] = useState(true);
  const [isLoadingMoreGenre, setIsLoadingMoreGenre] = useState(false);
  const [hasMoreGenre, setHasMoreGenre] = useState(true);

  const searchBarRef = useRef<any>(null);
  const cacheMediaItemRef = useRef(cacheMediaItem);
  useEffect(() => {
    cacheMediaItemRef.current = cacheMediaItem;
  }, [cacheMediaItem]);



  // Fetch Genre Catalogue via API
  // Load / Update Genre Data on tab or filter change
  useEffect(() => {
    let isMounted = true;
    genreCatalogueService
      .fetchGenreItems({
        genreId: selectedGenreId,
        format: selectedFormat,
        sort: selectedSort,
        page: 1,
      })
      .then((items) => {
        if (isMounted) {
          setGenreItems(items);
          setIsLoadingGenre(false);
          setGenrePage(1);
          setHasMoreGenre(items.length >= 15);
        }
      })
      .catch((err) => {
        console.warn('Failed to load genre items:', err);
        if (isMounted) {
          setGenreItems([]);
          setIsLoadingGenre(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGenreId, selectedFormat, selectedSort]);

  // Load More Genre Items (Infinite Scroll Pagination)
  const handleLoadMoreGenre = useCallback(async () => {
    if (isLoadingMoreGenre || isLoadingGenre || !hasMoreGenre) return;
    setIsLoadingMoreGenre(true);
    const nextPage = genrePage + 1;

    try {
      const more = await genreCatalogueService.fetchGenreItems({
        genreId: selectedGenreId,
        format: selectedFormat,
        sort: selectedSort,
        page: nextPage,
      });

      if (more.length === 0) {
        setHasMoreGenre(false);
      } else {
        setGenreItems((prev) => {
          const ids = new Set(prev.map((it) => it.id));
          const fresh = more.filter((it) => !ids.has(it.id));
          return [...prev, ...fresh];
        });
        setGenrePage(nextPage);
      }
    } catch {
      setHasMoreGenre(false);
    } finally {
      setIsLoadingMoreGenre(false);
    }
  }, [isLoadingMoreGenre, isLoadingGenre, hasMoreGenre, genrePage, selectedGenreId, selectedFormat, selectedSort]);

  // Live Auto-Suggestion & Predictive Search
  useEffect(() => {
    let isMounted = true;
    const cleanQ = query.trim();

    const timer = setTimeout(async () => {
      if (cleanQ.length < 2) {
        if (isMounted) setSuggestions([]);
        return;
      }
      try {
        const items = await typoCorrectionService.getSuggestions(cleanQ);
        if (isMounted) setSuggestions(items);
      } catch {
        if (isMounted) setSuggestions([]);
      }
    }, cleanQ.length < 2 ? 0 : 110);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Universal Search Query Execution
  useEffect(() => {
    let isMounted = true;
    const cleanQ = query.trim();

    if (!cleanQ) {
      return;
    }

    const timer = setTimeout(async () => {
      if (isMounted) setIsSearching(true);
      try {
        const category =
          selectedFormat === 'movie'
            ? 'movies'
            : selectedFormat === 'tv'
            ? 'series'
            : selectedFormat === 'anime'
            ? 'anime'
            : 'all';

        const results = await mediaEngine.search({
          query: cleanQ,
          category,
          limit: 24,
          page: 1,
        });

        if (isMounted) {
          results.forEach((it) => cacheMediaItemRef.current(it));
          setSearchResults(results);
          setIsSearching(false);
          setSearchPage(1);
          setHasMoreSearch(results.length >= 20);
        }
      } catch (err) {
        console.warn('Universal search error:', err);
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, selectedFormat]);

  // Load More Search Results (Pagination)
  const handleLoadMoreSearchResults = useCallback(async () => {
    if (isLoadingMoreSearch || isSearching || !hasMoreSearch || !query.trim()) return;
    setIsLoadingMoreSearch(true);
    const nextPage = searchPage + 1;

    try {
      const category =
        selectedFormat === 'movie'
          ? 'movies'
          : selectedFormat === 'tv'
          ? 'series'
          : selectedFormat === 'anime'
          ? 'anime'
          : 'all';

      const more = await mediaEngine.search({
        query: query.trim(),
        category,
        limit: 21,
        page: nextPage,
      });

      if (more.length === 0) {
        setHasMoreSearch(false);
      } else {
        more.forEach((it) => cacheMediaItemRef.current(it));
        setSearchResults((prev) => mediaEngine.deduplicateAndEnrich([...prev, ...more]));
        setSearchPage(nextPage);
      }
    } catch {
      setHasMoreSearch(false);
    } finally {
      setIsLoadingMoreSearch(false);
    }
  }, [isLoadingMoreSearch, isSearching, hasMoreSearch, query, searchPage, selectedFormat]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      setSearchResults([]);
      setIsSearching(false);
      setSearchPage(1);
      setHasMoreSearch(true);
    }
  };

  const handleClearQuery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    setSuggestions([]);
    setSearchResults([]);
    setIsSearching(false);
    setSearchPage(1);
    setHasMoreSearch(true);
    Keyboard.dismiss();
  };

  const applySuggestion = (s: string) => {
    Haptics.selectionAsync();
    setQuery(s);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleSelectGenre = (id: string) => {
    if (id === selectedGenreId) return;
    Haptics.selectionAsync();
    setIsLoadingGenre(true);
    setSelectedGenreId(id);
  };

  const handleSelectFormat = (fmt: GenreFormat) => {
    if (fmt === selectedFormat) return;
    Haptics.selectionAsync();
    setIsLoadingGenre(true);
    setSelectedFormat(fmt);
  };

  const handleSelectSort = (srt: GenreSort) => {
    if (srt === selectedSort) return;
    Haptics.selectionAsync();
    setIsLoadingGenre(true);
    setSelectedSort(srt);
  };

  const isFilterDirty =
    selectedGenreId !== 'ALL' ||
    selectedFormat !== 'all' ||
    selectedSort !== 'popularity.desc';

  const handleResetFilters = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedGenreId('ALL');
    setSelectedFormat('all');
    setSelectedSort('popularity.desc');
    setIsLoadingGenre(true);
  };

  const isSearchActive = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER & UNIVERSAL SEARCH BAR */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text
            style={styles.headerTitle}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.25}
          >
            EXPLORE
          </Text>
        </View>

        {/* Swiss Brutalist Search Input */}
        <View style={[styles.searchBar, isInputFocused && styles.searchBarFocused]}>
          <Ionicons
            name="search"
            size={16}
            color={isInputFocused ? colors.accent : colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchBarRef}
            style={styles.searchInput}
            placeholder="Search films, series, anime, genres..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClearQuery}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Live Typo & Predictive Autocomplete Chips */}
        {isInputFocused && suggestions.length > 0 && query.trim().length >= 2 && (
          <View style={styles.suggestionsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.suggestionsContent}
            >
              {suggestions.map((s, idx) => (
                <TouchableOpacity
                  key={`${s}-${idx}`}
                  style={styles.suggestionPill}
                  activeOpacity={0.75}
                  onPress={() => applySuggestion(s)}
                >
                  <Ionicons name="search-outline" size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.suggestionPillText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* 2. BODY CONTENT: CONDITIONAL SEARCH RESULTS VS. API GENRE CATALOGUE */}
      {isSearchActive ? (
        // ========================================================
        // UNIVERSAL SEARCH RESULTS VIEW
        // ========================================================
        <View style={styles.searchContainer}>
          {/* Format Filter Bar during search */}
          <View style={styles.searchFormatBar}>
            <View style={styles.segmentedContainer}>
              {FORMAT_OPTIONS.map((fmt, idx) => {
                const isActive = selectedFormat === fmt.id;
                const isLast = idx === FORMAT_OPTIONS.length - 1;
                return (
                  <TouchableOpacity
                    key={fmt.id}
                    style={[
                      styles.segmentBtn,
                      isLast && { borderRightWidth: 0 },
                      isActive && styles.segmentBtnActive,
                    ]}
                    onPress={() => handleSelectFormat(fmt.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.2}
                    >
                      {fmt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => <PosterCard item={item} width={106} showProgress={false} />}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.searchGridContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMoreSearchResults}
            onEndReachedThreshold={0.5}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsCount}>
                  {isSearching
                    ? 'SEARCHING...'
                    : `${searchResults.length} RESULTS${
                        selectedFormat !== 'all'
                          ? ` // ${FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.label}`
                          : ''
                      }`}
                </Text>
                {selectedFormat !== 'all' && (
                  <TouchableOpacity
                    onPress={() => handleSelectFormat('all')}
                    style={styles.clearFormatBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearFormatText}>ALL FORMATS</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListFooterComponent={
              isLoadingMoreSearch ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.footerLoaderText}>LOADING...</Text>
                </View>
              ) : !hasMoreSearch && searchResults.length > 0 ? (
                <View style={styles.footerEnd}>
                  <Text style={styles.footerEndText}>END OF RESULTS</Text>
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              !isSearching ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>NO TITLES FOUND</Text>
                  <Text style={styles.emptySubtitle}>
                    No {selectedFormat !== 'all' ? selectedFormat : 'media'} match &quot;{query}&quot;. Try adjusting your search term or format filter.
                  </Text>
                  {selectedFormat !== 'all' && (
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={() => handleSelectFormat('all')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.emptyResetBtnText}>SHOW ALL FORMATS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : undefined
            }
          />
        </View>
      ) : (
        // ========================================================
        // API-DRIVEN GENRE CATALOGUE VIEW (ONLY CONTENT)
        // ========================================================
        <View style={styles.genreCatalogueContainer}>
          {/* A. Horizontal Genre Selector Tabs */}
          <View style={styles.genreTabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genreTabsRow}
            >
              {genreList.map((g) => {
                const isActive = selectedGenreId.toUpperCase() === g.id.toUpperCase();
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => handleSelectGenre(g.id)}
                    style={[styles.genreTabBtn, isActive && styles.genreTabBtnActive]}
                    activeOpacity={0.75}
                  >
                    {isActive && <View style={styles.activeDot} />}
                    <Text
                      style={[
                        styles.genreTabText,
                        isActive ? styles.genreTabTextActive : styles.genreTabTextInactive,
                      ]}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.2}
                    >
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* B. Two-Tier Filter Controls: Segmented Format + Sort Controls */}
          <View style={styles.filterSection}>
            {/* Tier 1: Format Controller: 4-Way Segmented Bar */}
            <View style={styles.segmentedContainer}>
              {FORMAT_OPTIONS.map((fmt, idx) => {
                const isActive = selectedFormat === fmt.id;
                const isLast = idx === FORMAT_OPTIONS.length - 1;
                return (
                  <TouchableOpacity
                    key={fmt.id}
                    style={[
                      styles.segmentBtn,
                      isLast && { borderRightWidth: 0 },
                      isActive && styles.segmentBtnActive,
                    ]}
                    onPress={() => handleSelectFormat(fmt.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.2}
                    >
                      {fmt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tier 2: Sort Switcher & Active Filter Reset */}
            <View style={styles.sortBar}>
              <View style={styles.sortOptionsGroup}>
                <Text style={styles.sortLabel}>SORT //</Text>
                {SORT_OPTIONS.map((srt) => {
                  const isActive = selectedSort === srt.id;
                  return (
                    <TouchableOpacity
                      key={srt.id}
                      style={[styles.sortPill, isActive && styles.sortPillActive]}
                      onPress={() => handleSelectSort(srt.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.sortPillText, isActive && styles.sortPillTextActive]}
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.2}
                      >
                        {srt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isFilterDirty && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={11} color={colors.accent} style={{ marginRight: 2 }} />
                  <Text style={styles.resetBtnText}>RESET</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* C. 3-Column API Genre Catalogue Grid */}
          {isLoadingGenre ? (
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <FlatList
              data={genreItems}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              numColumns={3}
              renderItem={({ item }) => <PosterCard item={item} width={106} showProgress={false} />}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.catalogueGridContent}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMoreGenre}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingMoreGenre ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.footerLoaderText}>LOADING...</Text>
                  </View>
                ) : !hasMoreGenre && genreItems.length > 0 ? (
                  <View style={styles.footerEnd}>
                    <Text style={styles.footerEndText}>END OF RESULTS</Text>
                  </View>
                ) : undefined
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="film-outline" size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>NO TITLES IN THIS GENRE</Text>
                  <Text style={styles.emptySubtitle}>
                    No titles matching this format and sort filter. Try selecting another filter.
                  </Text>
                  {isFilterDirty && (
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={handleResetFilters}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.emptyResetBtnText}>RESET ALL FILTERS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.void,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 20,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchBarFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  suggestionsRow: {
    marginTop: 8,
  },
  suggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionPillText: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  searchGridContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 6,
  },
  searchResultsCount: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.accent,
  },
  genreCatalogueContainer: {
    flex: 1,
  },
  genreTabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.void,
  },
  genreTabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  genreTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreTabBtnActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accent,
  },
  activeDot: {
    width: 4,
    height: 4,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  genreTabText: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  genreTabTextActive: {
    color: colors.textPrimary,
  },
  genreTabTextInactive: {
    color: colors.textSecondary,
  },
  searchContainer: {
    flex: 1,
  },
  searchFormatBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.void,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  segmentBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: colors.accent,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.void,
    gap: 8,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortOptionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortPillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  sortPillText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  sortPillTextActive: {
    color: colors.accent,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resetBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.accent,
  },
  clearFormatBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearFormatText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  catalogueGridContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skeletonCard: {
    width: 106,
    height: 159,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  footerLoaderText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  footerEnd: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerEndText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: typography.fontBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyResetBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  emptyResetBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
});

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
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { mediaEngine } from '../../services/api/mediaEngine';
import { MediaItem } from '../../services/types';
import { PosterCard } from '../../components/PosterCard';
import { RandomPickerModal } from '../../components/RandomPickerModal';
import { typoCorrectionService } from '../../services/typoCorrection';
import { useTracking } from '../../context/TrackingContext';
import { storageService } from '../../services/storage';
import {
  genreCatalogueService,
  GenreFormat,
  GenreSort,
} from '../../services/genreCatalogueService';

const FORMAT_OPTIONS: { id: GenreFormat; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'movie', label: 'FILMS' },
  { id: 'tv', label: 'SERIES' },
  { id: 'anime', label: 'ANIME' },
];

const SORT_OPTIONS: { id: GenreSort; label: string; shortLabel: string }[] = [
  { id: 'popularity.desc', label: 'POPULAR', shortLabel: 'POPULAR' },
  { id: 'vote_average.desc', label: 'TOP RATED', shortLabel: 'TOP RATED' },
  { id: 'primary_release_date.desc', label: 'NEWEST', shortLabel: 'NEWEST' },
];

const QUICK_TRENDING_PICKS = [
  'Severance',
  'Shōgun',
  'Dark',
  'Past Lives',
  'Dune',
  'Breaking Bad',
  'Interstellar',
  'Spirited Away',
];

const HORIZONTAL_PADDING = 32;
const GRID_GAP = 10;

export default function ExploreScreen() {
  const { cacheMediaItem } = useTracking();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && windowWidth >= 768;

  const numColumns = useMemo(() => {
    if (!isDesktop) return 3;
    if (windowWidth >= 1200) return 6;
    if (windowWidth >= 900) return 5;
    return 4;
  }, [isDesktop, windowWidth]);

  // Exact mobile 3-column poster dimensions on phone; dynamic on desktop
  const cardWidth = useMemo(() => {
    if (!isDesktop) {
      return Math.floor((windowWidth - HORIZONTAL_PADDING - GRID_GAP * (3 - 1)) / 3);
    }
    const effectiveWidth = Math.min(windowWidth, 1280);
    return Math.floor((effectiveWidth - HORIZONTAL_PADDING - GRID_GAP * (numColumns - 1)) / numColumns);
  }, [isDesktop, windowWidth, numColumns]);

  // Universal Search State
  const [query, setQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);

  // Recent Searches State
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  const searchBarRef = useRef<any>(null);
  const cacheMediaItemRef = useRef(cacheMediaItem);
  useEffect(() => {
    cacheMediaItemRef.current = cacheMediaItem;
  }, [cacheMediaItem]);

  // Load Recent Searches on mount
  useEffect(() => {
    storageService.getRecentSearches().then((list) => {
      setRecentSearches(list);
    });
  }, []);

  // Fetch Genre Catalogue via API
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

          // Save to recent searches if there are results
          if (results.length > 0) {
            storageService.saveRecentSearch(cleanQ).then((updated) => {
              setRecentSearches(updated);
            });
          }
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

  // Android Hardware Back Button: Clear active search or unfocus before leaving
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (query.trim().length > 0) {
        handleClearQuery();
        return true;
      }
      if (isInputFocused) {
        searchBarRef.current?.blur();
        setIsInputFocused(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [query, isInputFocused]);

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

  // Cycle through Sort Options on tap
  const handleCycleSort = () => {
    Haptics.selectionAsync();
    setIsLoadingGenre(true);
    const currentIndex = SORT_OPTIONS.findIndex((s) => s.id === selectedSort);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    setSelectedSort(SORT_OPTIONS[nextIndex].id);
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

  const handleRemoveRecentSearch = async (term: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await storageService.removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecentSearches = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await storageService.clearRecentSearches();
    setRecentSearches([]);
  };

  const isSearchActive = query.trim().length > 0;
  const showRecentSearchesOverlay =
    isInputFocused && !isSearchActive && (recentSearches.length > 0 || QUICK_TRENDING_PICKS.length > 0);

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.id === selectedSort)?.label || 'POPULAR';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER & UNIVERSAL SEARCH BAR */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text
              style={styles.headerTitle}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.25}
            >
              EXPLORE
            </Text>

            <TouchableOpacity
              style={styles.randomBtn}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsRandomModalOpen(true);
              }}
            >
              <Ionicons name="dice-outline" size={13} color={colors.accent} style={{ marginRight: 5 }} />
              <Text style={styles.randomBtnText}>SURPRISE ME</Text>
            </TouchableOpacity>
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
              placeholder="Search films, series, anime, directors..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={handleQueryChange}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsInputFocused(false), 250);
              }}
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (query.trim()) {
                  storageService.saveRecentSearch(query.trim()).then(setRecentSearches);
                }
                Keyboard.dismiss();
              }}
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
      </View>

      {/* 2. RECENT SEARCHES OVERLAY (When search is focused but empty) */}
      {showRecentSearchesOverlay ? (
        <ScrollView
          style={[styles.recentOverlay, isDesktop && styles.containerDesktop]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentSectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="time-outline" size={13} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.recentSectionTitle}>RECENT SEARCHES</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClearAllRecentSearches}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearAllText}>CLEAR ALL</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recentChipsWrap}>
                {recentSearches.map((item) => (
                  <View key={item} style={styles.recentChip}>
                    <TouchableOpacity
                      style={styles.recentChipMain}
                      activeOpacity={0.7}
                      onPress={() => applySuggestion(item)}
                    >
                      <Text style={styles.recentChipText} numberOfLines={1}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.recentChipRemove}
                      onPress={() => handleRemoveRecentSearch(item)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={11} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trending-up" size={13} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.recentSectionTitle}>POPULAR DISCOVERIES</Text>
              </View>
            </View>

            <View style={styles.recentChipsWrap}>
              {QUICK_TRENDING_PICKS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.trendingChip}
                  activeOpacity={0.7}
                  onPress={() => applySuggestion(item)}
                >
                  <Text style={styles.trendingChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : isSearchActive ? (
        // ========================================================
        // UNIVERSAL SEARCH RESULTS VIEW
        // ========================================================
        <View style={[styles.searchContainer, isDesktop && styles.containerDesktop]}>
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
            key={`search-${numColumns}`}
            data={searchResults}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            renderItem={({ item }) => <PosterCard item={item} width={cardWidth} showProgress={false} />}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.searchGridContent, isDesktop && styles.gridContentDesktop]}
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
                          ? ` · ${FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.label}`
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
        // STREAMLINED GENRE & DISCOVERY CATALOGUE VIEW
        // ========================================================
        <View style={[styles.genreCatalogueContainer, isDesktop && styles.containerDesktop]}>
          {/* STREAMLINED FILTER CONTROL: 2 SLEEK ROWS INSTEAD OF 3 CLUTTERED TIERS */}
          <View style={styles.streamlinedFilterSection}>
            {/* Row 1: 4-Way Segmented Format Rail */}
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

            {/* Row 2: Clean Combined Sort Toggle + Horizontal Genre Rail */}
            <View style={styles.genreAndSortRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreAndSortContent}
              >
                {/* 1. Cycle Sort Pill */}
                <TouchableOpacity
                  style={[
                    styles.cycleSortPill,
                    selectedSort !== 'popularity.desc' && styles.cycleSortPillActive,
                  ]}
                  onPress={handleCycleSort}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="swap-vertical-outline"
                    size={11}
                    color={selectedSort !== 'popularity.desc' ? colors.accent : colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.cycleSortText,
                      selectedSort !== 'popularity.desc' && styles.cycleSortTextActive,
                    ]}
                  >
                    {currentSortLabel}
                  </Text>
                </TouchableOpacity>

                {/* 2. Reset Filter Chip (If any filter changed) */}
                {isFilterDirty && (
                  <TouchableOpacity
                    style={styles.inlineResetBtn}
                    onPress={handleResetFilters}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="close" size={11} color={colors.accent} style={{ marginRight: 2 }} />
                    <Text style={styles.inlineResetText}>RESET</Text>
                  </TouchableOpacity>
                )}

                {/* Vertical Divider in Rail */}
                <View style={styles.railDivider} />

                {/* 3. Genre Pills */}
                {genreList.map((g) => {
                  const isActive = selectedGenreId.toUpperCase() === g.id.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => handleSelectGenre(g.id)}
                      style={[styles.genrePill, isActive && styles.genrePillActive]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.genrePillText,
                          isActive ? styles.genrePillTextActive : styles.genrePillTextInactive,
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
          </View>

          {/* 3-Column API Catalogue Grid with Dynamic Card Width */}
          {isLoadingGenre ? (
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.skeletonCard,
                    { width: cardWidth, height: cardWidth * 1.5 },
                  ]}
                />
              ))}
            </View>
          ) : (
            <FlatList
              key={`genre-${numColumns}`}
              data={genreItems}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              numColumns={numColumns}
              renderItem={({ item }) => (
                <PosterCard item={item} width={cardWidth} showProgress={false} />
              )}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={[styles.catalogueGridContent, isDesktop && styles.gridContentDesktop]}
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

      {/* Random Recommendation Modal ("Surprise Me") */}
      <RandomPickerModal
        visible={isRandomModalOpen}
        onClose={() => setIsRandomModalOpen(false)}
        exploreItems={genreItems}
      />
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
    paddingTop: Platform.OS === 'web' ? ('max(env(safe-area-inset-top, 0px), 12px)' as any) : 8,
    paddingBottom: 12,
    backgroundColor: colors.void,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    width: '100%',
  },
  headerContentDesktop: {
    maxWidth: 1280,
    alignSelf: 'center',
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
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
  },
  randomBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.8,
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
    height: 44,
    borderRadius: 2,
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
    marginTop: 10,
  },
  suggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  suggestionPillText: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    color: colors.textSecondary,
    includeFontPadding: false,
  },

  // Recent Searches & Trending Overlay
  recentOverlay: {
    flex: 1,
    backgroundColor: colors.void,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSectionTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.textPrimary,
  },
  clearAllText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: colors.accent,
  },
  recentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  recentChipMain: {
    paddingHorizontal: 10,
    paddingVertical: 6.5,
  },
  recentChipText: {
    fontFamily: typography.fontMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  recentChipRemove: {
    paddingHorizontal: 8,
    paddingVertical: 6.5,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  trendingChip: {
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
  },
  trendingChipText: {
    fontFamily: typography.fontMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },

  // Streamlined Filter Section
  streamlinedFilterSection: {
    backgroundColor: colors.void,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderBottomColor: colors.accent,
  },
  segmentBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  segmentBtnTextActive: {
    color: colors.accent,
  },
  genreAndSortRow: {
    paddingVertical: 10,
    backgroundColor: colors.void,
  },
  genreAndSortContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleSortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
  },
  cycleSortPillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  cycleSortText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  cycleSortTextActive: {
    color: colors.accent,
  },
  inlineResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 2,
  },
  inlineResetText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.accent,
    includeFontPadding: false,
  },
  railDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: 1,
  },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genrePillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  genrePillText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    includeFontPadding: false,
  },
  genrePillTextActive: {
    color: colors.accent,
  },
  genrePillTextInactive: {
    color: colors.textSecondary,
  },

  // Grid & Content
  gridRow: {
    gap: GRID_GAP,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
  },
  containerDesktop: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  searchFormatBar: {
    backgroundColor: colors.void,
  },
  searchGridContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 84 : 24,
  },
  gridContentDesktop: {
    paddingBottom: 96,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  searchResultsCount: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.accent,
    includeFontPadding: false,
  },
  clearFormatBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 2,
  },
  clearFormatText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  genreCatalogueContainer: {
    flex: 1,
  },
  catalogueGridContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'web' ? 84 : 24,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  skeletonCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    borderRadius: 3,
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
    borderRadius: 2,
  },
  emptyResetBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
});

import { MediaItem } from '../../types';

const ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';

interface ArchiveDoc {
  identifier: string;
  title: string;
  description?: string;
  year?: string;
  creator?: string;
  mediatype?: string;
}

export const archiveService = {
  async search(query: string, limit = 15, page = 1): Promise<MediaItem[]> {
    try {
      const q = `mediatype:movies AND (${encodeURIComponent(query)})`;
      const res = await fetch(
        `${ARCHIVE_SEARCH_URL}?q=${q}&fl[]=identifier,title,description,year,creator,mediatype&rows=${limit}&page=${page}&output=json`
      );
      if (!res.ok) return [];

      const json: { response?: { docs?: ArchiveDoc[] } } = await res.json();
      if (!json.response?.docs) return [];

      return json.response.docs.map((doc, idx) => {
        const year = doc.year ? parseInt(doc.year, 10) : 1950;
        const poster = `https://archive.org/services/img/${doc.identifier}`;

        return {
          id: `archive-${doc.identifier}`,
          title: doc.title || 'Untitled Archive Film',
          type: 'documentary',
          sourceProvider: 'archive',
          externalIds: {
            archiveId: doc.identifier,
          },
          posterPath: poster,
          releaseYear: isNaN(year) ? 1950 : year,
          overview: doc.description || 'Public domain film preserved in the Internet Archive collection.',
          genres: ['Classic', 'Documentary', 'Archive'],
          tmdbRating: 8.0,
          communityRating: 8.0,
          ratingSource: 'Internet Archive',
          directors: doc.creator ? [doc.creator] : undefined,
        };
      });
    } catch {
      return [];
    }
  },
};

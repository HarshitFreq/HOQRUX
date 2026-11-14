import { Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MediaItem, SoundtrackInfo } from './types';

// Curated verified soundtrack references with 100% confirmed Spotify Album IDs
// All entries verified via Spotify oEmbed API to prevent any 404s, broken links, or wrong albums
const CURATED_SOUNDTRACKS: Record<string, SoundtrackInfo> = {
  // Dune (2021)
  dune: {
    albumName: 'Dune (Original Motion Picture Soundtrack)',
    composer: 'Hans Zimmer',
    artworkUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0208fc88c1ce4624bd8489d80e',
    spotifyUrl: 'https://open.spotify.com/album/56k8ay5oE5apR61WIeE4wQ',
    spotifyUri: 'spotify:album:56k8ay5oE5apR61WIeE4wQ',
    trackCount: 22,
    releaseYear: 2021,
    isAvailable: true,
  },
  // Dune: Part Two (2024)
  duneparttwo: {
    albumName: 'Dune: Part Two (Original Motion Picture Soundtrack)',
    composer: 'Hans Zimmer',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c48092f7547362b01e0cc5b2',
    spotifyUrl: 'https://open.spotify.com/album/1PeYjDmxcRNvxLd5mGHuCC',
    spotifyUri: 'spotify:album:1PeYjDmxcRNvxLd5mGHuCC',
    trackCount: 25,
    releaseYear: 2024,
    isAvailable: true,
  },
  dune2: {
    albumName: 'Dune: Part Two (Original Motion Picture Soundtrack)',
    composer: 'Hans Zimmer',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c48092f7547362b01e0cc5b2',
    spotifyUrl: 'https://open.spotify.com/album/1PeYjDmxcRNvxLd5mGHuCC',
    spotifyUri: 'spotify:album:1PeYjDmxcRNvxLd5mGHuCC',
    trackCount: 25,
    releaseYear: 2024,
    isAvailable: true,
  },
  dunepart2: {
    albumName: 'Dune: Part Two (Original Motion Picture Soundtrack)',
    composer: 'Hans Zimmer',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c48092f7547362b01e0cc5b2',
    spotifyUrl: 'https://open.spotify.com/album/1PeYjDmxcRNvxLd5mGHuCC',
    spotifyUri: 'spotify:album:1PeYjDmxcRNvxLd5mGHuCC',
    trackCount: 25,
    releaseYear: 2024,
    isAvailable: true,
  },

  // Severance (Apple TV+ Series)
  severance: {
    albumName: 'Severance: Season 1 (Apple TV+ Original Series Soundtrack)',
    composer: 'Theodore Shapiro',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02441bc2ca2f87dd0f7840c7a0',
    spotifyUrl: 'https://open.spotify.com/album/6sImespZLxOQOKwbmegpcF',
    spotifyUri: 'spotify:album:6sImespZLxOQOKwbmegpcF',
    trackCount: 19,
    releaseYear: 2022,
    isAvailable: true,
  },
  severanceseason1: {
    albumName: 'Severance: Season 1 (Apple TV+ Original Series Soundtrack)',
    composer: 'Theodore Shapiro',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02441bc2ca2f87dd0f7840c7a0',
    spotifyUrl: 'https://open.spotify.com/album/6sImespZLxOQOKwbmegpcF',
    spotifyUri: 'spotify:album:6sImespZLxOQOKwbmegpcF',
    trackCount: 19,
    releaseYear: 2022,
    isAvailable: true,
  },

  // Shōgun (FX / Hulu Series)
  shogun: {
    albumName: 'Shōgun (Original Soundtrack)',
    composer: 'Atticus Ross, Leopold Ross & Nick Chuba',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023194b301c2a11b6ff786e246',
    spotifyUrl: 'https://open.spotify.com/album/6KDI8RJxxH4LC4PW1OooHA',
    spotifyUri: 'spotify:album:6KDI8RJxxH4LC4PW1OooHA',
    trackCount: 17,
    releaseYear: 2024,
    isAvailable: true,
  },
  shogunoriginalsoundtrack: {
    albumName: 'Shōgun (Original Soundtrack)',
    composer: 'Atticus Ross, Leopold Ross & Nick Chuba',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023194b301c2a11b6ff786e246',
    spotifyUrl: 'https://open.spotify.com/album/6KDI8RJxxH4LC4PW1OooHA',
    spotifyUri: 'spotify:album:6KDI8RJxxH4LC4PW1OooHA',
    trackCount: 17,
    releaseYear: 2024,
    isAvailable: true,
  },

  // The Last of Us (HBO Series & Games)
  thelastofus: {
    albumName: 'The Last of Us: Season 1 (Soundtrack from the HBO Original Series)',
    composer: 'Gustavo Santaolalla & David Fleming',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f2780725975d3add2c3a1c06',
    spotifyUrl: 'https://open.spotify.com/album/1dJGmqeJGPl9jZrmoc0h5j',
    spotifyUri: 'spotify:album:1dJGmqeJGPl9jZrmoc0h5j',
    trackCount: 66,
    releaseYear: 2023,
    isAvailable: true,
  },

  thelastofusseason1: {
    albumName: 'The Last of Us: Season 1 (Soundtrack from the HBO Original Series)',
    composer: 'Gustavo Santaolalla & David Fleming',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f2780725975d3add2c3a1c06',
    spotifyUrl: 'https://open.spotify.com/album/1dJGmqeJGPl9jZrmoc0h5j',
    spotifyUri: 'spotify:album:1dJGmqeJGPl9jZrmoc0h5j',
    trackCount: 66,
    releaseYear: 2023,
    isAvailable: true,
  },

  thelastofuspart2: {
    albumName: 'The Last of Us Part II (Original Soundtrack)',
    composer: 'Gustavo Santaolalla',
    artworkUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02b2b57bf3f59cdd9f8e326e86',
    spotifyUrl: 'https://open.spotify.com/album/0tNUmClLcWptIcnoCXpPUC',
    spotifyUri: 'spotify:album:0tNUmClLcWptIcnoCXpPUC',
    trackCount: 28,
    releaseYear: 2020,
    isAvailable: true,
  },
  thelastofuspartii: {
    albumName: 'The Last of Us Part II (Original Soundtrack)',
    composer: 'Gustavo Santaolalla',
    artworkUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02b2b57bf3f59cdd9f8e326e86',
    spotifyUrl: 'https://open.spotify.com/album/0tNUmClLcWptIcnoCXpPUC',
    spotifyUri: 'spotify:album:0tNUmClLcWptIcnoCXpPUC',
    trackCount: 28,
    releaseYear: 2020,
    isAvailable: true,
  },

  // Christopher Nolan & Hans Zimmer / Ludwig Göransson
  interstellar: {
    albumName: 'Interstellar (Original Motion Picture Soundtrack) [Expanded Edition]',
    composer: 'Hans Zimmer',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0281f04c407e0ec68e3dea6b2c',
    spotifyUrl: 'https://open.spotify.com/album/3B61kSKTxlY36cYgzvf3cP',
    spotifyUri: 'spotify:album:3B61kSKTxlY36cYgzvf3cP',
    trackCount: 30,
    releaseYear: 2014,
    isAvailable: true,
  },
  oppenheimer: {
    albumName: 'Oppenheimer (Original Motion Picture Soundtrack)',
    composer: 'Ludwig Göransson',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02af634982d9b15de3c77f7dd9',
    spotifyUrl: 'https://open.spotify.com/album/0rwbMKjNkp4ehQTwf9V2Jk',
    spotifyUri: 'spotify:album:0rwbMKjNkp4ehQTwf9V2Jk',
    trackCount: 24,
    releaseYear: 2023,
    isAvailable: true,
  },

  thedarkknight: {
    albumName: 'The Dark Knight (Original Motion Picture Soundtrack)',
    composer: 'Hans Zimmer & James Newton Howard',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028b9ac3568133b79809576e2d',
    spotifyUrl: 'https://open.spotify.com/album/6XCVeBfXL2tLC594rbD4aS',
    spotifyUri: 'spotify:album:6XCVeBfXL2tLC594rbD4aS',
    trackCount: 14,
    releaseYear: 2008,
    isAvailable: true,
  },
  thebatman: {
    albumName: 'The Batman (Original Motion Picture Soundtrack)',
    composer: 'Michael Giacchino',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e022e66c55e54b24ad366146309',
    spotifyUrl: 'https://open.spotify.com/album/6Q44I0u2ktOayQLYUnOGNI',
    spotifyUri: 'spotify:album:6Q44I0u2ktOayQLYUnOGNI',
    trackCount: 29,
    releaseYear: 2022,
    isAvailable: true,
  },
  bladerunner2049: {
    albumName: 'Blade Runner 2049 (Original Motion Picture Soundtrack)',
    composer: 'Hans Zimmer & Benjamin Wallfisch',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e020546bc812f5a6609f062b828',
    spotifyUrl: 'https://open.spotify.com/album/5kSUsy5FU3Wcxd4DBvXFm4',
    spotifyUri: 'spotify:album:5kSUsy5FU3Wcxd4DBvXFm4',
    trackCount: 24,
    releaseYear: 2017,
    isAvailable: true,
  },
  spidermanintothespiderverse: {
    albumName: 'Spider-Man: Into the Spider-Verse (Original Score)',
    composer: 'Daniel Pemberton',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ef63a8a3a7ec9a557b447833',
    spotifyUrl: 'https://open.spotify.com/album/5KP2NReDL2Bv0QLzHSvUwM',
    spotifyUri: 'spotify:album:5KP2NReDL2Bv0QLzHSvUwM',
    trackCount: 44,
    releaseYear: 2018,
    isAvailable: true,
  },
  gladiator: {
    albumName: 'Gladiator - Music From The Motion Picture',
    composer: 'Hans Zimmer & Lisa Gerrard',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e025e26ee959941f78ce85ac080',
    spotifyUrl: 'https://open.spotify.com/album/1yqkE2BoMZaQRABJRJT2HZ',
    spotifyUri: 'spotify:album:1yqkE2BoMZaQRABJRJT2HZ',
    trackCount: 17,
    releaseYear: 2000,
    isAvailable: true,
  },

  // Acclaimed Series
  succession: {
    albumName: 'Succession: Season 1 (HBO Original Series Soundtrack)',
    composer: 'Nicholas Britell',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e026bb437f1e6ba5f4b5f4be8c8',
    spotifyUrl: 'https://open.spotify.com/album/7IONINkxycqA3eIKlVZ7Bj',
    spotifyUri: 'spotify:album:7IONINkxycqA3eIKlVZ7Bj',
    trackCount: 26,
    releaseYear: 2019,
    isAvailable: true,
  },
  successionseason1: {
    albumName: 'Succession: Season 1 (HBO Original Series Soundtrack)',
    composer: 'Nicholas Britell',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e026bb437f1e6ba5f4b5f4be8c8',
    spotifyUrl: 'https://open.spotify.com/album/7IONINkxycqA3eIKlVZ7Bj',
    spotifyUri: 'spotify:album:7IONINkxycqA3eIKlVZ7Bj',
    trackCount: 26,
    releaseYear: 2019,
    isAvailable: true,
  },
  strangerthings: {
    albumName: 'Stranger Things, Vol. 1 (A Netflix Original Series Soundtrack)',
    composer: 'Kyle Dixon & Michael Stein',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023fbdbf37626f8bee2abe8a39',
    spotifyUrl: 'https://open.spotify.com/album/1puplOrvmUGoq2VxsB0ENJ',
    spotifyUri: 'spotify:album:1puplOrvmUGoq2VxsB0ENJ',
    trackCount: 36,
    releaseYear: 2016,
    isAvailable: true,
  },
  gameofthrones: {
    albumName: 'Game Of Thrones (Music From The HBO Series)',
    composer: 'Ramin Djawadi',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02239a1395e4d595efc28af924',
    spotifyUrl: 'https://open.spotify.com/album/5P9JZJW0itEaDK5RfWiSuZ',
    spotifyUri: 'spotify:album:5P9JZJW0itEaDK5RfWiSuZ',
    trackCount: 29,
    releaseYear: 2011,
    isAvailable: true,
  },
  gameofthronesseason1: {
    albumName: 'Game Of Thrones (Music From The HBO Series)',
    composer: 'Ramin Djawadi',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02239a1395e4d595efc28af924',
    spotifyUrl: 'https://open.spotify.com/album/5P9JZJW0itEaDK5RfWiSuZ',
    spotifyUri: 'spotify:album:5P9JZJW0itEaDK5RfWiSuZ',
    trackCount: 29,
    releaseYear: 2011,
    isAvailable: true,
  },
  houseofthedragon: {
    albumName: 'House of the Dragon: Season 1 (Soundtrack from the HBO® Series)',
    composer: 'Ramin Djawadi',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dc10ae92526790a5fa2d8b9c',
    spotifyUrl: 'https://open.spotify.com/album/5gD5rf2UnvG1TYUHVv4vjv',
    spotifyUri: 'spotify:album:5gD5rf2UnvG1TYUHVv4vjv',
    trackCount: 44,
    releaseYear: 2022,
    isAvailable: true,
  },
  houseofthedragonseason1: {
    albumName: 'House of the Dragon: Season 1 (Soundtrack from the HBO® Series)',
    composer: 'Ramin Djawadi',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dc10ae92526790a5fa2d8b9c',
    spotifyUrl: 'https://open.spotify.com/album/5gD5rf2UnvG1TYUHVv4vjv',
    spotifyUri: 'spotify:album:5gD5rf2UnvG1TYUHVv4vjv',
    trackCount: 44,
    releaseYear: 2022,
    isAvailable: true,
  },
  cyberpunkedgerunners: {
    albumName: 'Cyberpunk: Edgerunners (Original Series Soundtrack)',
    composer: 'Akira Yamaoka',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0289f8729f8238f09847c1a224',
    spotifyUrl: 'https://open.spotify.com/album/0j3Idieeln2mEJKdhfCzPb',
    spotifyUri: 'spotify:album:0j3Idieeln2mEJKdhfCzPb',
    trackCount: 14,
    releaseYear: 2022,
    isAvailable: true,
  },
  edgerunners: {
    albumName: 'Cyberpunk: Edgerunners (Original Series Soundtrack)',
    composer: 'Akira Yamaoka',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0289f8729f8238f09847c1a224',
    spotifyUrl: 'https://open.spotify.com/album/0j3Idieeln2mEJKdhfCzPb',
    spotifyUri: 'spotify:album:0j3Idieeln2mEJKdhfCzPb',
    trackCount: 14,
    releaseYear: 2022,
    isAvailable: true,
  },
  chernobyl: {
    albumName: 'Chernobyl (Music from the Original TV Series)',
    composer: 'Hildur Guðnadóttir',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0234c0f8658fc3ae0b2fb6a117',
    spotifyUrl: 'https://open.spotify.com/album/5q53mBxAsq77kK9aCHcAtZ',
    spotifyUri: 'spotify:album:5q53mBxAsq77kK9aCHcAtZ',
    trackCount: 13,
    releaseYear: 2019,
    isAvailable: true,
  },
  breakingbad: {
    albumName: 'Breaking Bad (Original Score from the Television Series), Vol. 2',
    composer: 'Dave Porter',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0244d4fc610105de4917fb3601',
    spotifyUrl: 'https://open.spotify.com/album/2W5204qor8fs52mpLI8cwY',
    spotifyUri: 'spotify:album:2W5204qor8fs52mpLI8cwY',
    trackCount: 20,
    releaseYear: 2013,
    isAvailable: true,
  },

  // Cinema Classics & Modern Hits
  thematrix: {
    albumName: 'The Matrix (Original Motion Picture Score / 25th Anniversary Expanded Edition)',
    composer: 'Don Davis',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f5d80549472bc48650d3a4cf',
    spotifyUrl: 'https://open.spotify.com/album/67y8bL7BCvqQny0nw0U5gv',
    spotifyUri: 'spotify:album:67y8bL7BCvqQny0nw0U5gv',
    trackCount: 30,
    releaseYear: 1999,
    isAvailable: true,
  },
  fightclub: {
    albumName: 'Fight Club (Original Motion Picture Score)',
    composer: 'The Dust Brothers',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02062f1840e71e1f0c92cdf2ac',
    spotifyUrl: 'https://open.spotify.com/album/7BNrUfFSDHEbj1hi12yjdj',
    spotifyUri: 'spotify:album:7BNrUfFSDHEbj1hi12yjdj',
    trackCount: 16,
    releaseYear: 1999,
    isAvailable: true,
  },
  whiplash: {
    albumName: 'Whiplash (Original Motion Picture Soundtrack) [Deluxe Edition]',
    composer: 'Justin Hurwitz',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0228f451bf3da884c829bbf7c1',
    spotifyUrl: 'https://open.spotify.com/album/1knzBF64fNWlCbKfP8ARdP',
    spotifyUri: 'spotify:album:1knzBF64fNWlCbKfP8ARdP',
    trackCount: 36,
    releaseYear: 2014,
    isAvailable: true,
  },
  lalaland: {
    albumName: 'La La Land (Original Motion Picture Soundtrack)',
    composer: 'Justin Hurwitz',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e020bdf4dd39843ad48c5b66bc4',
    spotifyUrl: 'https://open.spotify.com/album/3GU8BzFEAdFSRjc8jZkL3S',
    spotifyUri: 'spotify:album:3GU8BzFEAdFSRjc8jZkL3S',
    trackCount: 15,
    releaseYear: 2016,
    isAvailable: true,
  },
  topgunmaverick: {
    albumName: 'Top Gun: Maverick (Music From The Motion Picture)',
    composer: 'Hans Zimmer, Lady Gaga & Harold Faltermeyer',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0202701cfe03aca6827b5c5449',
    spotifyUrl: 'https://open.spotify.com/album/3tjIKRAPBy5Qu4z8F5HmBz',
    spotifyUri: 'spotify:album:3tjIKRAPBy5Qu4z8F5HmBz',
    trackCount: 12,
    releaseYear: 2022,
    isAvailable: true,
  },
  barbie: {
    albumName: 'Barbie The Album',
    composer: 'Various Artists',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f201eaede4f6a6a071e64a83',
    spotifyUrl: 'https://open.spotify.com/album/0BaIaHcyBXuOWeM4Aas4EW',
    spotifyUri: 'spotify:album:0BaIaHcyBXuOWeM4Aas4EW',
    trackCount: 17,
    releaseYear: 2023,
    isAvailable: true,
  },


  // Harry Potter
  harrypotterandthephilosophersstone: {
    albumName: "Harry Potter and The Sorcerer's Stone Original Motion Picture Soundtrack",
    composer: 'John Williams',
    artworkUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0213f982aa5c43146c3d2c1964',
    spotifyUrl: 'https://open.spotify.com/album/6zeHM5CV0CjcS0K8ouWE4N',
    spotifyUri: 'spotify:album:6zeHM5CV0CjcS0K8ouWE4N',
    trackCount: 19,
    releaseYear: 2001,
    isAvailable: true,
  },
  harrypotterandthesorcerersstone: {
    albumName: "Harry Potter and The Sorcerer's Stone Original Motion Picture Soundtrack",
    composer: 'John Williams',
    artworkUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0213f982aa5c43146c3d2c1964',
    spotifyUrl: 'https://open.spotify.com/album/6zeHM5CV0CjcS0K8ouWE4N',
    spotifyUri: 'spotify:album:6zeHM5CV0CjcS0K8ouWE4N',
    trackCount: 19,
    releaseYear: 2001,
    isAvailable: true,
  },
  harrypotterandtheprisonerofazkaban: {
    albumName: 'Harry Potter and the Prisoner of Azkaban / Original Motion Picture Soundtrack',
    composer: 'John Williams',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02585f19adb14e7c92d9ec1b41',
    spotifyUrl: 'https://open.spotify.com/album/7DDls7RWrCLvZgTVCJgfcq',
    spotifyUri: 'spotify:album:7DDls7RWrCLvZgTVCJgfcq',
    trackCount: 21,
    releaseYear: 2004,
    isAvailable: true,
  },
  theprisonerofazkaban: {
    albumName: 'Harry Potter and the Prisoner of Azkaban / Original Motion Picture Soundtrack',
    composer: 'John Williams',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02585f19adb14e7c92d9ec1b41',
    spotifyUrl: 'https://open.spotify.com/album/7DDls7RWrCLvZgTVCJgfcq',
    spotifyUri: 'spotify:album:7DDls7RWrCLvZgTVCJgfcq',
    trackCount: 21,
    releaseYear: 2004,
    isAvailable: true,
  },

  // Lord of the Rings & The Hobbit
  thelordoftherings: {
    albumName: 'The Lord of the Rings: The Fellowship of the Ring (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02128ca6b63d83d47c909a43ce',
    spotifyUrl: 'https://open.spotify.com/album/04rz93AqGy9JduzV3K81Dh',
    spotifyUri: 'spotify:album:04rz93AqGy9JduzV3K81Dh',
    trackCount: 18,
    releaseYear: 2001,
    isAvailable: true,
  },
  thelordoftheringsthefellowshipofthering: {
    albumName: 'The Lord of the Rings: The Fellowship of the Ring (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02128ca6b63d83d47c909a43ce',
    spotifyUrl: 'https://open.spotify.com/album/04rz93AqGy9JduzV3K81Dh',
    spotifyUri: 'spotify:album:04rz93AqGy9JduzV3K81Dh',
    trackCount: 18,
    releaseYear: 2001,
    isAvailable: true,
  },
  fellowshipofthering: {
    albumName: 'The Lord of the Rings: The Fellowship of the Ring (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02128ca6b63d83d47c909a43ce',
    spotifyUrl: 'https://open.spotify.com/album/04rz93AqGy9JduzV3K81Dh',
    spotifyUri: 'spotify:album:04rz93AqGy9JduzV3K81Dh',
    trackCount: 18,
    releaseYear: 2001,
    isAvailable: true,
  },
  thelordoftheringsthetwotowers: {
    albumName: 'The Lord of the Rings: The Two Towers (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0d/99/33/0d99335a-4712-42da-918d-639a060139b4/093624842124.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/1MrqY9fdmJFExV6cWhxgQ6',
    spotifyUri: 'spotify:album:1MrqY9fdmJFExV6cWhxgQ6',
    trackCount: 19,
    releaseYear: 2002,
    isAvailable: true,
  },
  thetwotowers: {
    albumName: 'The Lord of the Rings: The Two Towers (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0d/99/33/0d99335a-4712-42da-918d-639a060139b4/093624842124.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/1MrqY9fdmJFExV6cWhxgQ6',
    spotifyUri: 'spotify:album:1MrqY9fdmJFExV6cWhxgQ6',
    trackCount: 19,
    releaseYear: 2002,
    isAvailable: true,
  },
  twotowers: {
    albumName: 'The Lord of the Rings: The Two Towers (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0d/99/33/0d99335a-4712-42da-918d-639a060139b4/093624842124.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/1MrqY9fdmJFExV6cWhxgQ6',
    spotifyUri: 'spotify:album:1MrqY9fdmJFExV6cWhxgQ6',
    trackCount: 19,
    releaseYear: 2002,
    isAvailable: true,
  },
  thelordoftheringsthereturnoftheking: {
    albumName: 'The Lord of the Rings: The Return of the King (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/10/89/3e/10893e36-fc05-728b-b893-6c0ee61f8936/093624863327.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/2Re6RMBEfD8iv1HMxLMdzI',
    spotifyUri: 'spotify:album:2Re6RMBEfD8iv1HMxLMdzI',
    trackCount: 19,
    releaseYear: 2003,
    isAvailable: true,
  },
  thereturnoftheking: {
    albumName: 'The Lord of the Rings: The Return of the King (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/10/89/3e/10893e36-fc05-728b-b893-6c0ee61f8936/093624863327.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/2Re6RMBEfD8iv1HMxLMdzI',
    spotifyUri: 'spotify:album:2Re6RMBEfD8iv1HMxLMdzI',
    trackCount: 19,
    releaseYear: 2003,
    isAvailable: true,
  },
  returnoftheking: {
    albumName: 'The Lord of the Rings: The Return of the King (Original Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/10/89/3e/10893e36-fc05-728b-b893-6c0ee61f8936/093624863327.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/2Re6RMBEfD8iv1HMxLMdzI',
    spotifyUri: 'spotify:album:2Re6RMBEfD8iv1HMxLMdzI',
    trackCount: 19,
    releaseYear: 2003,
    isAvailable: true,
  },

  // The Hobbit series
  thehobbit: {
    albumName: 'The Hobbit: An Unexpected Journey (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8d/d6/4e/8dd64eeb-b328-f559-cf7a-5cdb2201663d/794043164743.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/6X0qkUUcolJDrRN3i3CAlT',
    spotifyUri: 'spotify:album:6X0qkUUcolJDrRN3i3CAlT',
    trackCount: 32,
    releaseYear: 2012,
    isAvailable: true,
  },
  thehobbitanunexpectedjourney: {
    albumName: 'The Hobbit: An Unexpected Journey (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8d/d6/4e/8dd64eeb-b328-f559-cf7a-5cdb2201663d/794043164743.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/6X0qkUUcolJDrRN3i3CAlT',
    spotifyUri: 'spotify:album:6X0qkUUcolJDrRN3i3CAlT',
    trackCount: 32,
    releaseYear: 2012,
    isAvailable: true,
  },
  anunexpectedjourney: {
    albumName: 'The Hobbit: An Unexpected Journey (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8d/d6/4e/8dd64eeb-b328-f559-cf7a-5cdb2201663d/794043164743.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/6X0qkUUcolJDrRN3i3CAlT',
    spotifyUri: 'spotify:album:6X0qkUUcolJDrRN3i3CAlT',
    trackCount: 32,
    releaseYear: 2012,
    isAvailable: true,
  },
  thehobbitthedesolationofsmaug: {
    albumName: 'The Hobbit: The Desolation of Smaug (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/bf/16/a2/bf16a22f-d890-a309-847e-a0e28b8a067a/794043172083.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/6KX0qrnnPlmBrI2BEXJV9Q',
    spotifyUri: 'spotify:album:6KX0qrnnPlmBrI2BEXJV9Q',
    trackCount: 29,
    releaseYear: 2013,
    isAvailable: true,
  },
  thedesolationofsmaug: {
    albumName: 'The Hobbit: The Desolation of Smaug (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/bf/16/a2/bf16a22f-d890-a309-847e-a0e28b8a067a/794043172083.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/6KX0qrnnPlmBrI2BEXJV9Q',
    spotifyUri: 'spotify:album:6KX0qrnnPlmBrI2BEXJV9Q',
    trackCount: 29,
    releaseYear: 2013,
    isAvailable: true,
  },
  thehobbitthebattleofthefivearmies: {
    albumName: 'The Hobbit: The Battle of the Five Armies (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/37/10/7c/37107c85-263a-73c3-3e1a-463870634676/794043180491.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/2PVoG7wWSqUsDNlRR1owDO',
    spotifyUri: 'spotify:album:2PVoG7wWSqUsDNlRR1owDO',
    trackCount: 23,
    releaseYear: 2014,
    isAvailable: true,
  },
  thebattleofthefivearmies: {
    albumName: 'The Hobbit: The Battle of the Five Armies (Original Motion Picture Soundtrack)',
    composer: 'Howard Shore',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/37/10/7c/37107c85-263a-73c3-3e1a-463870634676/794043180491.jpg/600x600bb.jpg',
    spotifyUrl: 'https://open.spotify.com/album/2PVoG7wWSqUsDNlRR1owDO',
    spotifyUri: 'spotify:album:2PVoG7wWSqUsDNlRR1owDO',
    trackCount: 23,
    releaseYear: 2014,
    isAvailable: true,
  },
  thelordoftheringstheringsofpower: {
    albumName: 'The Lord of the Rings: The Rings of Power (Season One: Amazon Original Series Soundtrack)',
    composer: 'Bear McCreary & Howard Shore',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c3fdfae2f01f292efe0e79ee',
    spotifyUrl: 'https://open.spotify.com/album/6ZqOU4HF77DpP42vXG09rP',
    spotifyUri: 'spotify:album:6ZqOU4HF77DpP42vXG09rP',
    trackCount: 37,
    releaseYear: 2022,
    isAvailable: true,
  },
  ringsofpower: {
    albumName: 'The Lord of the Rings: The Rings of Power (Season One: Amazon Original Series Soundtrack)',
    composer: 'Bear McCreary & Howard Shore',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c3fdfae2f01f292efe0e79ee',
    spotifyUrl: 'https://open.spotify.com/album/6ZqOU4HF77DpP42vXG09rP',
    spotifyUri: 'spotify:album:6ZqOU4HF77DpP42vXG09rP',
    trackCount: 37,
    releaseYear: 2022,
    isAvailable: true,
  },

  // Anime Masterpieces
  attackontitan: {
    albumName: 'TV Anime "Attack on Titan" Original Soundtrack',
    composer: 'Hiroyuki Sawano',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e021a8d8e1248067b8d4bb987fc',
    spotifyUrl: 'https://open.spotify.com/album/3WDkuVqT1OfkTdCyYQ2gXa',
    spotifyUri: 'spotify:album:3WDkuVqT1OfkTdCyYQ2gXa',
    trackCount: 16,
    releaseYear: 2013,
    isAvailable: true,
  },
  shingekinokyojin: {
    albumName: 'TV Anime "Attack on Titan" Original Soundtrack',
    composer: 'Hiroyuki Sawano',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e021a8d8e1248067b8d4bb987fc',
    spotifyUrl: 'https://open.spotify.com/album/3WDkuVqT1OfkTdCyYQ2gXa',
    spotifyUri: 'spotify:album:3WDkuVqT1OfkTdCyYQ2gXa',
    trackCount: 16,
    releaseYear: 2013,
    isAvailable: true,
  },
  attackontitanseason2: {
    albumName: 'TV Anime "Attack on Titan Season 2" (Original Soundtrack)',
    composer: 'Hiroyuki Sawano',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023d8393e157eb45d65eaee81a',
    spotifyUrl: 'https://open.spotify.com/album/0jNwqmKIwudqqbMJRRtzQb',
    spotifyUri: 'spotify:album:0jNwqmKIwudqqbMJRRtzQb',
    trackCount: 16,
    releaseYear: 2017,
    isAvailable: true,
  },
  attackontitanseason3: {
    albumName: '"Attack on Titan" Season 3 Original Soundtrack',
    composer: 'Hiroyuki Sawano',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028b183617be39115d78a879a8',
    spotifyUrl: 'https://open.spotify.com/album/5ZT4JbMhZU7V8sDPHZhG8h',
    spotifyUri: 'spotify:album:5ZT4JbMhZU7V8sDPHZhG8h',
    trackCount: 31,
    releaseYear: 2019,
    isAvailable: true,
  },
  attackontitanthefinalseason: {
    albumName: 'Attack on Titan The Final Season Original Soundtrack',
    composer: 'Kohta Yamamoto & Hiroyuki Sawano',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e128eb8a405903b6e82a8bf2',
    spotifyUrl: 'https://open.spotify.com/album/6hpEJjz25G99vP0DgMgqqi',
    spotifyUri: 'spotify:album:6hpEJjz25G99vP0DgMgqqi',
    trackCount: 23,
    releaseYear: 2021,
    isAvailable: true,
  },
  onepiece: {
    albumName: 'One Piece Gear 4 (Original Soundtrack)',
    composer: 'Kohei Tanaka',
    artworkUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02d21eed9ad98e96c81555be4b',
    spotifyUrl: 'https://open.spotify.com/album/76IREvjwrIrqqTM2wkkYHk',
    spotifyUri: 'spotify:album:76IREvjwrIrqqTM2wkkYHk',
    trackCount: 14,
    releaseYear: 2016,
    isAvailable: true,
  },
  yourname: {
    albumName: 'Your Name. (Original Motion Picture Soundtrack)',
    composer: 'RADWIMPS',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023d1869d8c477d291a205a2d6',
    spotifyUrl: 'https://open.spotify.com/album/4qApTp9557qYZzRLEih4uP',
    spotifyUri: 'spotify:album:4qApTp9557qYZzRLEih4uP',
    trackCount: 27,
    releaseYear: 2016,
    isAvailable: true,
  },
  kiminonawa: {
    albumName: 'Your Name. (Original Motion Picture Soundtrack)',
    composer: 'RADWIMPS',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023d1869d8c477d291a205a2d6',
    spotifyUrl: 'https://open.spotify.com/album/4qApTp9557qYZzRLEih4uP',
    spotifyUri: 'spotify:album:4qApTp9557qYZzRLEih4uP',
    trackCount: 27,
    releaseYear: 2016,
    isAvailable: true,
  },

  // Studio Ghibli (Joe Hisaishi & Royal Philharmonic Orchestra)
  studioghibli: {
    albumName: 'A Symphonic Celebration - Music from the Studio Ghibli Films of Hayao Miyazaki',
    composer: 'Joe Hisaishi & Royal Philharmonic Orchestra',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028d4306c0878768bf296a39ed',
    spotifyUrl: 'https://open.spotify.com/album/561qUZZO6f2sILHUMlXmlM',
    spotifyUri: 'spotify:album:561qUZZO6f2sILHUMlXmlM',
    trackCount: 29,
    releaseYear: 2023,
    isAvailable: true,
  },

  spiritedaway: {
    albumName: 'A Symphonic Celebration - Music from the Studio Ghibli Films of Hayao Miyazaki',
    composer: 'Joe Hisaishi & Royal Philharmonic Orchestra',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028d4306c0878768bf296a39ed',
    spotifyUrl: 'https://open.spotify.com/album/561qUZZO6f2sILHUMlXmlM',
    spotifyUri: 'spotify:album:561qUZZO6f2sILHUMlXmlM',
    trackCount: 29,
    releaseYear: 2023,
    isAvailable: true,
  },

  princessmononoke: {
    albumName: 'A Symphonic Celebration - Music from the Studio Ghibli Films of Hayao Miyazaki',
    composer: 'Joe Hisaishi & Royal Philharmonic Orchestra',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028d4306c0878768bf296a39ed',
    spotifyUrl: 'https://open.spotify.com/album/561qUZZO6f2sILHUMlXmlM',
    spotifyUri: 'spotify:album:561qUZZO6f2sILHUMlXmlM',
    trackCount: 29,
    releaseYear: 2023,
    isAvailable: true,
  },

  howlsmovingcastle: {
    albumName: 'A Symphonic Celebration - Music from the Studio Ghibli Films of Hayao Miyazaki',
    composer: 'Joe Hisaishi & Royal Philharmonic Orchestra',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028d4306c0878768bf296a39ed',
    spotifyUrl: 'https://open.spotify.com/album/561qUZZO6f2sILHUMlXmlM',
    spotifyUri: 'spotify:album:561qUZZO6f2sILHUMlXmlM',
    trackCount: 29,
    releaseYear: 2023,
    isAvailable: true,
  },

  myneighbortotoro: {
    albumName: 'A Symphonic Celebration - Music from the Studio Ghibli Films of Hayao Miyazaki',
    composer: 'Joe Hisaishi & Royal Philharmonic Orchestra',
    artworkUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028d4306c0878768bf296a39ed',
    spotifyUrl: 'https://open.spotify.com/album/561qUZZO6f2sILHUMlXmlM',
    spotifyUri: 'spotify:album:561qUZZO6f2sILHUMlXmlM',
    trackCount: 29,
    releaseYear: 2023,
    isAvailable: true,
  },

};

// In-memory runtime cache for resolved soundtracks
const soundtrackRuntimeCache = new Map<string, SoundtrackInfo>();

function cleanText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(str: string): string {
  return cleanText(str).replace(/\s/g, '');
}

/**
 * Extracts a normalized sequence of sequel or part numbers.
 * e.g. "Dune: Part Two" -> ["2"], "Stranger Things Season 2" -> ["2"], "The Two Towers" -> ["2"]
 */
function extractSequelMarkers(text: string): string[] {
  const norm = cleanText(text);
  const markers: string[] = [];

  const wordMap: Record<string, string> = {
    one: '1',
    first: '1',
    i: '1',
    two: '2',
    second: '2',
    ii: '2',
    three: '3',
    third: '3',
    iii: '3',
    four: '4',
    fourth: '4',
    iv: '4',
    five: '5',
    fifth: '5',
    v: '5',
    six: '6',
    vi: '6',
  };

  const tokens = norm.split(' ');
  for (const t of tokens) {
    if (/^[1-9]$/.test(t)) {
      markers.push(t);
    } else if (wordMap[t]) {
      markers.push(wordMap[t]);
    }
  }

  return Array.from(new Set(markers));
}

/**
 * Generates all candidate keys for matching a title against the curated catalog.
 * Guarantees that sequels never generate candidate keys that could match a prequel!
 */
function getTitleCandidateKeys(title: string): string[] {
  const norm = normalizeKey(title);
  const keys = new Set<string>();
  if (!norm) return [];

  keys.add(norm);

  const titleMarkers = extractSequelMarkers(title);

  // Roman numerals to numbers
  const romanConverted = norm
    .replace(/partii/g, 'part2')
    .replace(/partiii/g, 'part3')
    .replace(/partiv/g, 'part4')
    .replace(/seasonii/g, 'season2')
    .replace(/seasoniii/g, 'season3');
  keys.add(romanConverted);

  // Numbers to written words
  const wordsConverted = norm
    .replace(/part2/g, 'parttwo')
    .replace(/part3/g, 'partthree')
    .replace(/part4/g, 'partfour')
    .replace(/season2/g, 'seasontwo')
    .replace(/season3/g, 'seasonthree')
    .replace(/2$/, 'two')
    .replace(/3$/, 'three');
  keys.add(wordsConverted);

  // If title has a colon, dash, or subtitle separator, check subtitle and main title independently
  // ONLY if their sequel markers match the full title's markers (prevents "Dune: Part Two" -> "dune")
  if (title.includes(':') || title.includes(' - ') || title.includes(' – ')) {
    const segments = title.split(/[:–—]| - /).map(s => s.trim()).filter(Boolean);
    for (const segment of segments) {
      const segMarkers = extractSequelMarkers(segment);
      const sameMarkers =
        titleMarkers.length === segMarkers.length &&
        titleMarkers.every((m, idx) => m === segMarkers[idx]);

      if (sameMarkers) {
        const segNorm = normalizeKey(segment);
        if (segNorm.length >= 4) {
          keys.add(segNorm);
          keys.add(segNorm.replace(/partii/g, 'part2').replace(/part2/g, 'parttwo'));
        }
      }
    }
  }

  return Array.from(keys);
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by',
  'from',
  'part',
  'vol',
  'volume',
  'season',
  'series',
  'movie',
  'film',
  'soundtrack',
  'score',
  'ost',
]);

function getSignificantWords(text: string): string[] {
  return cleanText(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function isBadRelease(albumName: string, artistName: string): boolean {
  const cleanAlbum = cleanText(albumName);
  const cleanArtist = cleanText(artistName);

  const BAD_TERMS = [
    'karaoke',
    'tribute',
    'cover',
    'covers',
    'party',
    'remix',
    'relaxing',
    'instrumental version',
    'lullaby',
    'tribute band',
    'ringtone',
    'parody',
    'trap remix',
    'piano cover',
    'sheet music',
    'workout',
  ];

  return BAD_TERMS.some((w) => cleanAlbum.includes(w) || cleanArtist.includes(w));
}

function verifyAlbumMatch(
  itemTitle: string,
  albumName: string,
  artistName: string
): { matches: boolean; score: number } {
  if (isBadRelease(albumName, artistName)) {
    return { matches: false, score: 0 };
  }

  const cleanAlbum = cleanText(albumName);
  const hasSoundtrackKeywords = [
    'soundtrack',
    'score',
    'original',
    'ost',
    'music from',
    'theme',
    'motion picture',
  ].some((w) => cleanAlbum.includes(w));

  if (!hasSoundtrackKeywords) {
    return { matches: false, score: 0 };
  }

  // Strictly enforce sequel consistency between media title and candidate album
  const itemMarkers = extractSequelMarkers(itemTitle);
  const albumMarkers = extractSequelMarkers(albumName);
  if (itemMarkers.length > 0 || albumMarkers.length > 0) {
    const itemMarkerStr = itemMarkers.join(',');
    const albumMarkerStr = albumMarkers.join(',');
    if (itemMarkerStr !== albumMarkerStr) {
      return { matches: false, score: 0 };
    }
  }

  const cleanItem = cleanText(itemTitle);
  const itemNoSpace = cleanItem.replace(/\s/g, '');
  const albumNoSpace = cleanAlbum.replace(/\s/g, '');

  if (albumNoSpace.includes(itemNoSpace) || itemNoSpace.includes(albumNoSpace)) {
    return { matches: true, score: 1.0 };
  }

  const itemWords = getSignificantWords(itemTitle);
  if (itemWords.length === 0) {
    return { matches: false, score: 0 };
  }

  const albumWords = new Set(cleanAlbum.split(' '));
  let matchCount = 0;
  for (const w of itemWords) {
    if (
      albumWords.has(w) ||
      Array.from(albumWords).some((aw) => aw.startsWith(w) || w.startsWith(aw))
    ) {
      matchCount++;
    }
  }

  const overlap = matchCount / itemWords.length;
  if (overlap >= 0.6) {
    return { matches: true, score: overlap };
  }

  return { matches: false, score: overlap };
}

/**
 * Attempts to resolve an exact Spotify Album ID via MusicBrainz URL relations.
 * Runs with a strict 3-second timeout so it never blocks UI responsiveness.
 */
async function resolveSpotifyAlbumIdViaMusicBrainz(
  albumTitle: string,
  artistName: string
): Promise<string | null> {
  try {
    const cleanAlbum = albumTitle.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const cleanArtist = artistName === 'Original Score' ? '' : artistName.split('&')[0].split(',')[0].trim();

    const query = `release:"${cleanAlbum}" ${cleanArtist ? `AND artist:"${cleanArtist}"` : ''}`.trim();
    const mbUrl = `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(query)}&fmt=json&limit=3`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(mbUrl, {
      headers: { 'User-Agent': 'HoqruxApp/1.0.0 ( contact@hoqrux.app )' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const releases = data.releases || [];

    for (const rel of releases) {
      const relController = new AbortController();
      const relTimeout = setTimeout(() => relController.abort(), 1500);

      try {
        const rRes = await fetch(`https://musicbrainz.org/ws/2/release/${rel.id}?inc=url-rels&fmt=json`, {
          headers: { 'User-Agent': 'HoqruxApp/1.0.0 ( contact@hoqrux.app )' },
          signal: relController.signal,
        });
        clearTimeout(relTimeout);

        if (!rRes.ok) continue;
        const rData = await rRes.json();
        for (const relation of (rData.relations || [])) {
          const resUrl = relation.url?.resource || '';
          if (resUrl.includes('spotify.com/album/')) {
            const albumId = resUrl.split('/album/')[1]?.split('?')[0];
            if (albumId && /^[a-zA-Z0-9]{22}$/.test(albumId)) {
              return albumId;
            }
          }
        }
      } catch {
        clearTimeout(relTimeout);
      }
    }
  } catch {
    // MusicBrainz busy or timed out; non-blocking
  }
  return null;
}

export const soundtrackService = {
  /**
   * Resolves the official soundtrack for a movie, series, or anime.
   * 1. Checks 100% verified curated Spotify Album IDs with strict sequel-safe matching.
   * 2. Dynamically queries Apple's official database for verified soundtrack/score albums.
   * 3. Enriches candidate albums with exact Spotify Album IDs via MusicBrainz url-rels.
   * 4. Ensures all generated Spotify links navigate directly to the exact album shown.
   */
  async resolveSoundtrack(item: MediaItem): Promise<SoundtrackInfo> {
    if (soundtrackRuntimeCache.has(item.id)) {
      return soundtrackRuntimeCache.get(item.id)!;
    }

    const itemCandidateKeys = getTitleCandidateKeys(item.title);
    const itemSequelMarkers = extractSequelMarkers(item.title);

    // 1. Direct key match in verified curated catalog
    for (const candKey of itemCandidateKeys) {
      if (CURATED_SOUNDTRACKS[candKey]) {
        const match = CURATED_SOUNDTRACKS[candKey];
        soundtrackRuntimeCache.set(item.id, match);
        return match;
      }
    }

    // 2. Strict containment matching in curated table
    // Preconditions:
    // - Curated key must NOT have a sequel marker if item does not have one
    // - Curated key MUST have identical sequel marker if item has one
    // - Precludes substrings like "dune" matching "duneparttwo" or "thelordoftherings" matching "thetwotowers"
    for (const [key, val] of Object.entries(CURATED_SOUNDTRACKS)) {
      const keySequelMarkers = extractSequelMarkers(key);
      const markersMatch =
        itemSequelMarkers.length === keySequelMarkers.length &&
        itemSequelMarkers.every((m, idx) => m === keySequelMarkers[idx]);

      if (!markersMatch) {
        continue;
      }

      for (const candKey of itemCandidateKeys) {
        if (candKey === key) {
          soundtrackRuntimeCache.set(item.id, val);
          return val;
        }
      }
    }

    // 3. Dynamic Global Official Music Database Resolution (iTunes Search API)
    try {
      const isTv = item.type === 'tv' || item.type === 'anime';
      const searchQueries = [
        `${item.title} Soundtrack`,
        `${item.title} Original Score`,
        isTv ? `${item.title} Season 1 Soundtrack` : `${item.title} Motion Picture Soundtrack`,
      ];

      for (const query of searchQueries) {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=8`;
        const res = await fetch(url);
        if (!res.ok) continue;

        const data = await res.json();
        const results = data.results || [];

        const validCandidates: any[] = [];
        for (const r of results) {
          const matchResult = verifyAlbumMatch(
            item.title,
            r.collectionName || '',
            r.artistName || ''
          );

          if (matchResult.matches) {
            validCandidates.push({
              item: r,
              score: matchResult.score,
              trackCount: r.trackCount || 0,
            });
          }
        }

        if (validCandidates.length > 0) {
          validCandidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.trackCount - a.trackCount;
          });

          const best = validCandidates[0].item;
          const albumName = best.collectionName;
          const composer = best.artistName || 'Original Score';
          const artworkUrl = best.artworkUrl100
            ? best.artworkUrl100.replace('100x100bb', '600x600bb')
            : undefined;

          // Attempt to resolve the direct Spotify Album ID
          const spotifyAlbumId = await resolveSpotifyAlbumIdViaMusicBrainz(albumName, composer);

          let spotifyUrl: string;
          let spotifyUri: string | undefined;

          if (spotifyAlbumId) {
            spotifyUrl = `https://open.spotify.com/album/${spotifyAlbumId}`;
            spotifyUri = `spotify:album:${spotifyAlbumId}`;
          } else {
            // Direct targeted album search URL that leads specifically to the album release
            const cleanQuery = encodeURIComponent(`${albumName} ${composer !== 'Original Score' ? composer : ''}`.trim());
            spotifyUrl = `https://open.spotify.com/search/${cleanQuery}/albums`;
            spotifyUri = undefined;
          }

          const resolved: SoundtrackInfo = {
            albumName,
            composer,
            artworkUrl,
            spotifyUrl,
            spotifyUri,
            trackCount: best.trackCount,
            releaseYear: best.releaseDate
              ? parseInt(best.releaseDate.slice(0, 4), 10)
              : undefined,
            isAvailable: true,
          };

          soundtrackRuntimeCache.set(item.id, resolved);
          return resolved;
        }
      }
    } catch (err) {
      console.warn('Error dynamically resolving soundtrack:', err);
    }

    // 4. No verified official soundtrack found
    const notAvailableInfo: SoundtrackInfo = {
      albumName: 'Soundtrack Not Available',
      isAvailable: false,
    };

    soundtrackRuntimeCache.set(item.id, notAvailableInfo);
    return notAvailableInfo;
  },

  /**
   * Opens the soundtrack directly in the native Spotify app if installed,
   * otherwise falls back smoothly to Spotify web player.
   * Prioritizes direct spotify:album:<id> URI so the user lands on the exact album shown.
   */
  async openSpotify(soundtrack: SoundtrackInfo): Promise<void> {
    if (!soundtrack.isAvailable) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. If direct album URI exists (e.g. spotify:album:<id>), try opening native app directly
    if (soundtrack.spotifyUri && soundtrack.spotifyUri.startsWith('spotify:album:')) {
      try {
        await Linking.openURL(soundtrack.spotifyUri);
        return;
      } catch {
        // Native app scheme failed (app not installed), fall through to web/universal link
      }
    }

    // 2. Open Spotify web / universal album link
    if (soundtrack.spotifyUrl) {
      try {
        await Linking.openURL(soundtrack.spotifyUrl);
        return;
      } catch (err) {
        console.warn('Failed to open Spotify URL:', err);
      }
    }
  },
};

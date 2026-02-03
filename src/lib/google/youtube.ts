import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { YouTubeVideo, YouTubeChannel } from '../types';

/* ===================== SEARCH VIDEOS ===================== */
export async function searchVideos(
  auth: OAuth2Client,
  query: string,
  limit: number = 5
): Promise<YouTubeVideo[]> {
  const youtube = google.youtube({ version: 'v3', auth });

  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      maxResults: limit,
      type: ['video'],
      safeSearch: 'moderate'
    });

    return (response.data.items || []).map((item) => ({
      id: item.id?.videoId || '',
      title: item.snippet?.title || 'No Title',
      description: item.snippet?.description || '',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishTime: item.snippet?.publishedAt || '',
      videoUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`
    }));
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw new Error('Failed to search YouTube videos.');
  }
}

/* ===================== GET CHANNEL STATS ===================== */
export async function getChannelStats(
  auth: OAuth2Client,
  channelName?: string,
  channelId?: string
): Promise<YouTubeChannel[]> {
  const youtube = google.youtube({ version: 'v3', auth });

  try {
    let targetId = channelId;

    // If no ID is provided but a name is, search for the channel first to get the ID
    if (!targetId && channelName) {
      const searchRes = await youtube.search.list({
        part: ['snippet'],
        q: channelName,
        type: ['channel'],
        maxResults: 1
      });
      
      if (searchRes.data.items && searchRes.data.items.length > 0) {
        targetId = searchRes.data.items[0].id?.channelId || undefined;
      }
    }

    if (!targetId) {
      return []; // Channel not found
    }

    // Fetch details using the Channel ID
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [targetId]
    });

    return (response.data.items || []).map((item) => ({
      id: item.id || '',
      title: item.snippet?.title || 'Unknown',
      description: item.snippet?.description || '',
      customUrl: item.snippet?.customUrl || '',
      subscriberCount: item.statistics?.subscriberCount || '0',
      viewCount: item.statistics?.viewCount || '0',
      videoCount: item.statistics?.videoCount || '0',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || ''
    }));

  } catch (error) {
    console.error('Error fetching YouTube channel stats:', error);
    throw new Error('Failed to fetch channel statistics.');
  }
}
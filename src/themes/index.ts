// src/themes/index.ts — drag from DCG verbatim, only the client line changes
import type { Theme } from '@/types/theme';
import { createBrowserClient } from '@supabase/ssr';

// In Docker, NEXT_PUBLIC_SUPABASE_URL is set to http://kong:8000 for server-side
// container networking. The browser can't resolve "kong" — it needs localhost:8000.
// NEXT_PUBLIC_SUPABASE_URL_BROWSER lets you set the browser-facing URL separately.
const supabaseUrl =
  (typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_SUPABASE_URL_BROWSER
    : undefined) ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabase = createBrowserClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Everything below this line is identical to DCG's themes/index.ts ──────────

let themesCache: Theme[] | null = null;
let themeMapCache: Record<string, Theme> | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchThemes(): Promise<Theme[]> {
  if (themesCache && Date.now() < cacheExpiry) return themesCache;

  try {
    console.log('🎨 Fetching themes from database...');

    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching themes:', error);
      throw new Error(`Failed to fetch themes: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No themes found in database');
      return [];
    }

    const themes: Theme[] = data.map(row => {
      try {
        const themeData = row.theme_data as Theme;
        return {
          ...themeData,
          id: row.id,
          name: row.name,
          description: row.description,
          previewColor: row.preview_color,
        };
      } catch (parseError) {
        console.error(`❌ Error parsing theme data for ${row.id}:`, parseError);
        throw new Error(`Invalid theme data for ${row.id}`);
      }
    });

    themesCache = themes;
    themeMapCache = null;
    cacheExpiry = Date.now() + CACHE_DURATION;

    console.log(`✅ Loaded ${themes.length} themes from database`);
    return themes;
  } catch (error) {
    console.error('❌ Fatal error fetching themes:', error);
    throw error;
  }
}

export async function getThemes(): Promise<Theme[]> {
  return await fetchThemes();
}

export async function getThemeMap(): Promise<Record<string, Theme>> {
  if (themeMapCache && Date.now() < cacheExpiry) return themeMapCache;
  const themes = await fetchThemes();
  themeMapCache = Object.fromEntries(themes.map(theme => [theme.id, theme]));
  return themeMapCache;
}

export async function getThemeById(id: string): Promise<Theme | null> {
  try {
    const themeMap = await getThemeMap();
    return themeMap[id] || null;
  } catch (error) {
    console.error(`❌ Error getting theme ${id}:`, error);
    return null;
  }
}

export function clearThemeCache(): void {
  themesCache = null;
  themeMapCache = null;
  cacheExpiry = 0;
  console.log('🗑️ Theme cache cleared');
}

export const defaultThemeId = 'default';
export const themes = [] as Theme[];
export const themeMap = {} as Record<string, Theme>;

export async function getAvailableThemeIds(): Promise<string[]> {
  try {
    const themes = await fetchThemes();
    return themes.map(theme => theme.id);
  } catch (error) {
    console.error('❌ Error getting theme IDs:', error);
    return [];
  }
}

export async function themeExists(id: string): Promise<boolean> {
  try {
    const theme = await getThemeById(id);
    return theme !== null;
  } catch (error) {
    console.error(`❌ Error checking if theme ${id} exists:`, error);
    return false;
  }
}

export async function getSystemThemes(): Promise<Theme[]> {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('is_system', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      ...(row.theme_data as Theme),
      id: row.id,
      name: row.name,
      description: row.description,
      previewColor: row.preview_color,
    }));
  } catch (error) {
    console.error('❌ Error fetching system themes:', error);
    return [];
  }
}

if (typeof window !== 'undefined') {
  fetchThemes().catch(error => {
    console.warn('⚠️ Failed to pre-load themes:', error);
  });
}
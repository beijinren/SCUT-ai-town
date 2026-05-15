using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.Tilemaps;

public static class AITownTileAtlasExporter
{
    private const int TILE_DIM = 32;

    // 你可以改这个值。
    // 12 列时，如果现在有 148 个 tile：
    // width = 12 * 32 = 384
    // height = ceil(148 / 12) * 32 = 13 * 32 = 416
    private const int ATLAS_COLUMNS = 12;

    [MenuItem("AITown/Export Tile Registry Atlas PNG")]
    public static void ExportTileRegistryAtlasPng()
    {
        try
        {
            Tilemap bgTilemap = FindTilemap("bgtiles");
            Tilemap objTilemap = FindTilemap("objmap");

            if (bgTilemap == null)
            {
                EditorUtility.DisplayDialog(
                    "Export Failed",
                    "Cannot find Tilemap named 'bgtiles'.",
                    "OK"
                );
                return;
            }

            if (objTilemap == null)
            {
                EditorUtility.DisplayDialog(
                    "Export Failed",
                    "Cannot find Tilemap named 'objmap'.",
                    "OK"
                );
                return;
            }

            BoundsInt exportBounds = CalculateExportBounds(bgTilemap, objTilemap);

            if (exportBounds.size.x <= 0 || exportBounds.size.y <= 0)
            {
                EditorUtility.DisplayDialog(
                    "Export Failed",
                    "Calculated map bounds are empty.",
                    "OK"
                );
                return;
            }

            TileIndexRegistry tileRegistry = new TileIndexRegistry();

            // 关键点：
            // 这里的扫描顺序必须和 AITownSceneExporter.cs 里的导出顺序一致：
            // 1. bgtiles
            // 2. objmap
            // 3. decoration
            // 4. obj_bot
            // 5. obj_top
            RegisterTilemap(bgTilemap, exportBounds, tileRegistry);
            RegisterTilemap(objTilemap, exportBounds, tileRegistry);

            RegisterOptionalTilemap("decoration", exportBounds, tileRegistry);
            RegisterOptionalTilemap("obj_bot", exportBounds, tileRegistry);
            RegisterOptionalTilemap("obj_top", exportBounds, tileRegistry);

            List<TileBase> tiles = tileRegistry.GetTilesInIndexOrder();

            if (tiles.Count == 0)
            {
                EditorUtility.DisplayDialog(
                    "Export Failed",
                    "No tiles found in the current scene.",
                    "OK"
                );
                return;
            }

            Texture2D atlas = BuildAtlasTexture(tiles, ATLAS_COLUMNS, TILE_DIM);

            string defaultFileName = "tileset.png";

            string path = EditorUtility.SaveFilePanel(
                "Export Tile Registry Atlas PNG",
                Application.dataPath,
                defaultFileName,
                "png"
            );

            if (string.IsNullOrEmpty(path))
            {
                Debug.Log("Atlas export cancelled.");
                return;
            }

            byte[] pngBytes = atlas.EncodeToPNG();
            File.WriteAllBytes(path, pngBytes);

            UnityEngine.Object.DestroyImmediate(atlas);

            AssetDatabase.Refresh();

            int rows = Mathf.CeilToInt(tiles.Count / (float)ATLAS_COLUMNS);
            int pixelWidth = ATLAS_COLUMNS * TILE_DIM;
            int pixelHeight = rows * TILE_DIM;

            EditorUtility.DisplayDialog(
                "Atlas Export Success",
                $"Tile atlas exported successfully:\n{path}\n\n" +
                $"Tile count: {tiles.Count}\n" +
                $"Atlas size: {pixelWidth} x {pixelHeight}\n" +
                $"Tile size: {TILE_DIM} x {TILE_DIM}\n\n" +
                $"Use these values in aiTown:\n" +
                $"tilesetpxw = {pixelWidth}\n" +
                $"tilesetpxh = {pixelHeight}",
                "OK"
            );

            Debug.Log($"[AITownTileAtlasExporter] Exported atlas to: {path}");
            Debug.Log($"[AITownTileAtlasExporter] Tile count: {tiles.Count}");
            Debug.Log($"[AITownTileAtlasExporter] Atlas size: {pixelWidth} x {pixelHeight}");
        }
        catch (Exception e)
        {
            Debug.LogError(e);
            EditorUtility.DisplayDialog("Atlas Export Failed", e.Message, "OK");
        }
    }

    private static Tilemap FindTilemap(string name)
    {
        GameObject obj = GameObject.Find(name);
        if (obj == null)
        {
            return null;
        }

        return obj.GetComponent<Tilemap>();
    }

    private static BoundsInt CalculateExportBounds(params Tilemap[] tilemaps)
    {
        bool hasAny = false;

        int minX = int.MaxValue;
        int minY = int.MaxValue;
        int maxX = int.MinValue;
        int maxY = int.MinValue;

        foreach (Tilemap tilemap in tilemaps)
        {
            if (tilemap == null)
            {
                continue;
            }

            tilemap.CompressBounds();
            BoundsInt bounds = tilemap.cellBounds;

            foreach (Vector3Int pos in bounds.allPositionsWithin)
            {
                if (!tilemap.HasTile(pos))
                {
                    continue;
                }

                hasAny = true;

                minX = Mathf.Min(minX, pos.x);
                minY = Mathf.Min(minY, pos.y);
                maxX = Mathf.Max(maxX, pos.x);
                maxY = Mathf.Max(maxY, pos.y);
            }
        }

        if (!hasAny)
        {
            return new BoundsInt(0, 0, 0, 0, 0, 0);
        }

        int width = maxX - minX + 1;
        int height = maxY - minY + 1;

        return new BoundsInt(minX, minY, 0, width, height, 1);
    }

    private static void RegisterOptionalTilemap(
        string tilemapName,
        BoundsInt exportBounds,
        TileIndexRegistry tileRegistry
    )
    {
        Tilemap tilemap = FindTilemap(tilemapName);
        if (tilemap == null)
        {
            return;
        }

        RegisterTilemap(tilemap, exportBounds, tileRegistry);
    }

    private static void RegisterTilemap(
        Tilemap tilemap,
        BoundsInt exportBounds,
        TileIndexRegistry tileRegistry
    )
    {
        int width = exportBounds.size.x;
        int height = exportBounds.size.y;

        for (int row = 0; row < height; row++)
        {
            for (int col = 0; col < width; col++)
            {
                int unityX = exportBounds.xMin + col;

                // 必须和 JSON 导出脚本保持一致：
                // JSON rows 是从上往下，所以这里也按同样顺序扫描。
                int unityY = exportBounds.yMax - 1 - row;

                Vector3Int cell = new Vector3Int(unityX, unityY, 0);
                TileBase tile = tilemap.GetTile(cell);

                if (tile == null)
                {
                    continue;
                }

                tileRegistry.GetOrCreateIndex(tile);
            }
        }
    }

    private static Texture2D BuildAtlasTexture(
        List<TileBase> tiles,
        int columns,
        int tileDim
    )
    {
        int rows = Mathf.CeilToInt(tiles.Count / (float)columns);

        int atlasWidth = columns * tileDim;
        int atlasHeight = rows * tileDim;

        Texture2D atlas = new Texture2D(
            atlasWidth,
            atlasHeight,
            TextureFormat.RGBA32,
            false
        );

        atlas.filterMode = FilterMode.Point;

        Color32[] clearPixels = new Color32[atlasWidth * atlasHeight];
        for (int i = 0; i < clearPixels.Length; i++)
        {
            clearPixels[i] = new Color32(0, 0, 0, 0);
        }

        atlas.SetPixels32(clearPixels);

        for (int index = 0; index < tiles.Count; index++)
        {
            TileBase tile = tiles[index];
            Sprite sprite = GetSpriteFromTile(tile);

            if (sprite == null)
            {
                Debug.LogWarning(
                    $"[AITownTileAtlasExporter] Tile has no sprite and will be transparent. " +
                    $"Index: {index}, Tile: {tile.name}"
                );
                continue;
            }

            Texture2D tileTexture = ExtractSpriteTexture(sprite, tileDim);

            int col = index % columns;
            int row = index / columns;

            int dstX = col * tileDim;

            // PNG 像素坐标原点在左下角。
            // 这里把 index 0 放在 atlas 的第一行“视觉上的左上角”，
            // 方便 PixiJS 按 y 从上到下切图。
            int dstY = atlasHeight - ((row + 1) * tileDim);

            atlas.SetPixels32(dstX, dstY, tileDim, tileDim, tileTexture.GetPixels32());

            UnityEngine.Object.DestroyImmediate(tileTexture);
        }

        atlas.Apply();

        return atlas;
    }

    private static Sprite GetSpriteFromTile(TileBase tile)
    {
        if (tile == null)
        {
            return null;
        }

        // 最常见情况：Unity 自带 Tile 类型
        if (tile is Tile normalTile)
        {
            return normalTile.sprite;
        }

        // 某些自定义 Tile 也可能有 sprite 字段或属性。
        // 用反射兜底。
        Type type = tile.GetType();

        PropertyInfo spriteProperty = type.GetProperty(
            "sprite",
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance
        );

        if (spriteProperty != null && spriteProperty.PropertyType == typeof(Sprite))
        {
            return spriteProperty.GetValue(tile) as Sprite;
        }

        FieldInfo spriteField = type.GetField(
            "sprite",
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance
        );

        if (spriteField != null && spriteField.FieldType == typeof(Sprite))
        {
            return spriteField.GetValue(tile) as Sprite;
        }

        return null;
    }

    private static Texture2D ExtractSpriteTexture(Sprite sprite, int targetSize)
    {
        Texture2D source = sprite.texture;
        Rect rect = sprite.textureRect;

        string assetPath = AssetDatabase.GetAssetPath(source);
        TextureImporter importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;

        bool changedReadable = false;
        bool originalReadable = false;

        if (importer != null)
        {
            originalReadable = importer.isReadable;

            if (!importer.isReadable)
            {
                importer.isReadable = true;
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                importer.filterMode = FilterMode.Point;
                importer.SaveAndReimport();
                changedReadable = true;
            }
        }

        Texture2D result = new Texture2D(
            targetSize,
            targetSize,
            TextureFormat.RGBA32,
            false
        );

        result.filterMode = FilterMode.Point;

        Color32[] transparent = new Color32[targetSize * targetSize];
        for (int i = 0; i < transparent.Length; i++)
        {
            transparent[i] = new Color32(0, 0, 0, 0);
        }

        result.SetPixels32(transparent);

        try
        {
            int spriteX = Mathf.RoundToInt(rect.x);
            int spriteY = Mathf.RoundToInt(rect.y);
            int spriteW = Mathf.RoundToInt(rect.width);
            int spriteH = Mathf.RoundToInt(rect.height);

            Texture2D cropped = new Texture2D(
                spriteW,
                spriteH,
                TextureFormat.RGBA32,
                false
            );

            cropped.filterMode = FilterMode.Point;

            Color[] pixels = source.GetPixels(spriteX, spriteY, spriteW, spriteH);
            cropped.SetPixels(pixels);
            cropped.Apply();

            Texture2D finalTile;

            if (spriteW == targetSize && spriteH == targetSize)
            {
                finalTile = cropped;
            }
            else
            {
                finalTile = ResizeNearest(cropped, targetSize, targetSize);
                UnityEngine.Object.DestroyImmediate(cropped);
            }

            result.SetPixels32(0, 0, targetSize, targetSize, finalTile.GetPixels32());
            result.Apply();

            UnityEngine.Object.DestroyImmediate(finalTile);
        }
        finally
        {
            if (importer != null && changedReadable)
            {
                importer.isReadable = originalReadable;
                importer.SaveAndReimport();
            }
        }

        return result;
    }

    private static Texture2D ResizeNearest(Texture2D source, int width, int height)
    {
        Texture2D result = new Texture2D(
            width,
            height,
            TextureFormat.RGBA32,
            false
        );

        result.filterMode = FilterMode.Point;

        Color32[] resultPixels = new Color32[width * height];

        int sourceWidth = source.width;
        int sourceHeight = source.height;

        Color32[] sourcePixels = source.GetPixels32();

        for (int y = 0; y < height; y++)
        {
            int srcY = Mathf.Clamp(
                Mathf.FloorToInt(y * sourceHeight / (float)height),
                0,
                sourceHeight - 1
            );

            for (int x = 0; x < width; x++)
            {
                int srcX = Mathf.Clamp(
                    Mathf.FloorToInt(x * sourceWidth / (float)width),
                    0,
                    sourceWidth - 1
                );

                resultPixels[y * width + x] = sourcePixels[srcY * sourceWidth + srcX];
            }
        }

        result.SetPixels32(resultPixels);
        result.Apply();

        return result;
    }

    private class TileIndexRegistry
    {
        private readonly Dictionary<TileBase, int> tileToIndex =
            new Dictionary<TileBase, int>();

        private readonly List<TileBase> tilesInIndexOrder =
            new List<TileBase>();

        public int GetOrCreateIndex(TileBase tile)
        {
            if (tileToIndex.TryGetValue(tile, out int existingIndex))
            {
                return existingIndex;
            }

            int newIndex = tileToIndex.Count;
            tileToIndex[tile] = newIndex;
            tilesInIndexOrder.Add(tile);

            return newIndex;
        }

        public List<TileBase> GetTilesInIndexOrder()
        {
            return tilesInIndexOrder;
        }
    }
}
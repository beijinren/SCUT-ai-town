using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Tilemaps;

public static class AITownSceneExporter
{
    private const int TILE_DIM = 32;

    [MenuItem("AITown/Export Current Scene To JSON")]
    public static void ExportCurrentSceneToJson()
    {
        try
        {
            GameObject gridObj = GameObject.Find("Grid");
            if (gridObj == null)
            {
                EditorUtility.DisplayDialog("Export Failed", "Cannot find GameObject named 'Grid'.", "OK");
                return;
            }

            Tilemap bgTilemap = FindTilemap("bgtiles");
            Tilemap objTilemap = FindTilemap("objmap");

            if (bgTilemap == null)
            {
                EditorUtility.DisplayDialog("Export Failed", "Cannot find Tilemap named 'bgtiles'.", "OK");
                return;
            }

            if (objTilemap == null)
            {
                EditorUtility.DisplayDialog("Export Failed", "Cannot find Tilemap named 'objmap'.", "OK");
                return;
            }

            BoundsInt exportBounds = CalculateExportBounds(bgTilemap, objTilemap);

            if (exportBounds.size.x <= 0 || exportBounds.size.y <= 0)
            {
                EditorUtility.DisplayDialog("Export Failed", "Calculated map bounds are empty.", "OK");
                return;
            }

            TileIndexRegistry tileRegistry = new TileIndexRegistry();

            ExportedScene scene = new ExportedScene
            {
                sceneId = "interview_room",
                sceneName = "Interview Room",
                tileDim = TILE_DIM,
                width = exportBounds.size.x,
                height = exportBounds.size.y,
                originX = exportBounds.xMin,
                originY = exportBounds.yMin,
                tileSet = new ExportedTileSet
                {
                    image = "maps/interview_room/tileset.png",
                    pixelWidth = 0,
                    pixelHeight = 0
                },
                bgLayers = new List<ExportedTileLayer>(),
                collisionLayers = new List<ExportedTileLayer>(),
                visualLayers = new List<ExportedTileLayer>(),
                zones = ExportZones(),
                objects = ExportSemanticObjects(),
                markers = ExportMarkers()
            };

            scene.bgLayers.Add(new ExportedTileLayer
{
    name = "bgtiles",
    rows = ExportTilemap(bgTilemap, exportBounds, tileRegistry)
});

            scene.collisionLayers.Add(new ExportedTileLayer
{
    name = "objmap",
    rows = ExportTilemap(objTilemap, exportBounds, tileRegistry)
});

            ExportOptionalVisualLayer(scene, "decoration", exportBounds, tileRegistry);
            ExportOptionalVisualLayer(scene, "obj_bot", exportBounds, tileRegistry);
            ExportOptionalVisualLayer(scene, "obj_top", exportBounds, tileRegistry);

            scene.tileRegistry = tileRegistry.ToExportList();

            string defaultFileName = "interview_room.json";
            string path = EditorUtility.SaveFilePanel(
                "Export AITown Scene JSON",
                Application.dataPath,
                defaultFileName,
                "json"
            );

            if (string.IsNullOrEmpty(path))
            {
                Debug.Log("Export cancelled.");
                return;
            }

            string json = JsonUtility.ToJson(scene, true);
            File.WriteAllText(path, json);

            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog(
                "Export Success",
                $"Scene exported successfully:\\n{path}\\n\\nMap size: {scene.width} x {scene.height}\\nTile count: {scene.tileRegistry.Count}",
                "OK"
            );

            Debug.Log($"[AITownSceneExporter] Exported scene to: {path}");
            Debug.Log($"[AITownSceneExporter] Map size: {scene.width} x {scene.height}");
            Debug.Log($"[AITownSceneExporter] Tile registry count: {scene.tileRegistry.Count}");
        }
        catch (Exception e)
        {
            Debug.LogError(e);
            EditorUtility.DisplayDialog("Export Failed", e.Message, "OK");
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

    private static List<ExportedTileRow> ExportTilemap(
    Tilemap tilemap,
    BoundsInt exportBounds,
    TileIndexRegistry tileRegistry
)
{
    int width = exportBounds.size.x;
    int height = exportBounds.size.y;

    List<ExportedTileRow> result = new List<ExportedTileRow>();

    for (int row = 0; row < height; row++)
    {
        ExportedTileRow exportedRow = new ExportedTileRow
        {
            tiles = new List<int>()
        };

        for (int col = 0; col < width; col++)
        {
            int unityX = exportBounds.xMin + col;

            // Convert from Unity Y-up grid to exported Y-down rows.
            int unityY = exportBounds.yMax - 1 - row;

            Vector3Int cell = new Vector3Int(unityX, unityY, 0);
            TileBase tile = tilemap.GetTile(cell);

            if (tile == null)
            {
                exportedRow.tiles.Add(-1);
            }
            else
            {
                exportedRow.tiles.Add(tileRegistry.GetOrCreateIndex(tile));
            }
        }

        result.Add(exportedRow);
    }

    return result;
}

    private static void ExportOptionalVisualLayer(
        ExportedScene scene,
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

        scene.visualLayers.Add(new ExportedTileLayer

{

    name = tilemapName,

    rows = ExportTilemap(tilemap, exportBounds, tileRegistry)

});
    }

    private static List<ExportedZone> ExportZones()
    {
        List<ExportedZone> zones = new List<ExportedZone>();

        ZoneMarker[] markers = UnityEngine.Object.FindObjectsOfType<ZoneMarker>();

        foreach (ZoneMarker marker in markers)
        {
            zones.Add(new ExportedZone
            {
                id = marker.zoneId,
                name = marker.zoneName,
                roomId = marker.roomId,
                minX = marker.minX,
                minY = marker.minY,
                maxX = marker.maxX,
                maxY = marker.maxY,
                tags = marker.tags ?? Array.Empty<string>(),
                socialMeaning = marker.socialMeaning
            });
        }

        zones.Sort((a, b) => string.Compare(a.id, b.id, StringComparison.Ordinal));

        return zones;
    }

    private static List<ExportedSemanticObject> ExportSemanticObjects()
    {
        List<ExportedSemanticObject> objects = new List<ExportedSemanticObject>();

        SemanticObjectMarker[] markers = UnityEngine.Object.FindObjectsOfType<SemanticObjectMarker>();

        foreach (SemanticObjectMarker marker in markers)
        {
            Vector2Int gridPosition = marker.GridPosition;

            objects.Add(new ExportedSemanticObject
            {
                id = marker.objectId,
                name = marker.objectName,
                kind = marker.kind.ToString(),
                x = gridPosition.x,
                y = gridPosition.y,
                roomId = marker.roomId,
                zoneId = marker.zoneId,
                parentObjectId = marker.parentObjectId,
                interactive = marker.interactive,
                blocking = marker.blocking,
                tags = marker.tags ?? Array.Empty<string>(),
                affordances = marker.affordances ?? Array.Empty<string>(),
                description = marker.description
            });
        }

        objects.Sort((a, b) => string.Compare(a.id, b.id, StringComparison.Ordinal));

        return objects;
    }

    private static List<ExportedMarker> ExportMarkers()
    {
        List<ExportedMarker> markers = new List<ExportedMarker>();

        SceneMarker[] sceneMarkers = UnityEngine.Object.FindObjectsOfType<SceneMarker>();

        foreach (SceneMarker marker in sceneMarkers)
        {
            Vector2Int gridPosition = marker.GridPosition;

            markers.Add(new ExportedMarker
            {
                id = marker.markerId,
                type = marker.markerType.ToString(),
                x = gridPosition.x,
                y = gridPosition.y,
                role = marker.role,
                targetObjectId = marker.targetObjectId,
                tags = marker.tags ?? Array.Empty<string>(),
                description = marker.description
            });
        }

        markers.Sort((a, b) => string.Compare(a.id, b.id, StringComparison.Ordinal));

        return markers;
    }

    [Serializable]
    private class ExportedScene
    {
        public string sceneId;
        public string sceneName;
        public int tileDim;
        public int width;
        public int height;
        public int originX;
        public int originY;
        public ExportedTileSet tileSet;
        public List<ExportedTileLayer> bgLayers;
        public List<ExportedTileLayer> collisionLayers;
        public List<ExportedTileLayer> visualLayers;
        public List<ExportedZone> zones;
        public List<ExportedSemanticObject> objects;
        public List<ExportedMarker> markers;
        public List<ExportedTileRegistryItem> tileRegistry;
    }

    [Serializable]
    private class ExportedTileSet
    {
        public string image;
        public int pixelWidth;
        public int pixelHeight;
    }

    [Serializable]
private class ExportedTileLayer
{
    public string name;
    public List<ExportedTileRow> rows;
}

[Serializable]
private class ExportedTileRow
{
    public List<int> tiles;
}

    [Serializable]
    private class ExportedZone
    {
        public string id;
        public string name;
        public string roomId;
        public int minX;
        public int minY;
        public int maxX;
        public int maxY;
        public string[] tags;
        public string socialMeaning;
    }

    [Serializable]
    private class ExportedSemanticObject
    {
        public string id;
        public string name;
        public string kind;
        public int x;
        public int y;
        public string roomId;
        public string zoneId;
        public string parentObjectId;
        public bool interactive;
        public bool blocking;
        public string[] tags;
        public string[] affordances;
        public string description;
    }

    [Serializable]
    private class ExportedMarker
    {
        public string id;
        public string type;
        public int x;
        public int y;
        public string role;
        public string targetObjectId;
        public string[] tags;
        public string description;
    }

    [Serializable]
    private class ExportedTileRegistryItem
    {
        public int index;
        public string tileName;
    }

    private class TileIndexRegistry
    {
        private readonly Dictionary<TileBase, int> tileToIndex = new Dictionary<TileBase, int>();
        private readonly List<ExportedTileRegistryItem> exportList = new List<ExportedTileRegistryItem>();

        public int GetOrCreateIndex(TileBase tile)
        {
            if (tileToIndex.TryGetValue(tile, out int existingIndex))
            {
                return existingIndex;
            }

            int newIndex = tileToIndex.Count;
            tileToIndex[tile] = newIndex;

            exportList.Add(new ExportedTileRegistryItem
            {
                index = newIndex,
                tileName = tile.name
            });

            return newIndex;
        }

        public List<ExportedTileRegistryItem> ToExportList()
        {
            return exportList;
        }
    }
}
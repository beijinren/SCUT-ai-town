import { Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useMemo } from 'react';
import { Player } from '../../convex/aiTown/player';
import { WorldMap } from '../../convex/aiTown/worldMap';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';

type OverlayObject = {
  id: string;
  name: string;
  x: number;
  y: number;
  distance: number;
};

type OverlayPlayer = {
  id: string;
  x: number;
  y: number;
  distance: number;
};

function buildFallbackNearbyPlayers(
  game: ServerGame,
  centerPlayer: Player,
  maxDistance = 5,
): OverlayPlayer[] {
  return [...game.world.players.values()]
    .filter((candidate) => candidate.id !== centerPlayer.id)
    .map((candidate) => {
      const dx = candidate.position.x - centerPlayer.position.x;
      const dy = candidate.position.y - centerPlayer.position.y;
      return {
        id: candidate.id,
        x: candidate.position.x,
        y: candidate.position.y,
        distance: Math.hypot(dx, dy),
      };
    })
    .filter((candidate) => (candidate.distance ?? Infinity) <= maxDistance)
    .sort((left, right) => (left.distance ?? Infinity) - (right.distance ?? Infinity));
}

function buildFallbackNearbyObjects(map: WorldMap, player: Player): OverlayObject[] {
  return map
    .getNearbyObjects(player.position, 3.5)
    .map((object) => {
      const dx = object.x - player.position.x;
      const dy = object.y - player.position.y;
      return {
        id: object.id,
        name: object.name,
        x: object.x,
        y: object.y,
        distance: Math.hypot(dx, dy),
      };
    })
    .sort((left, right) => (left.distance ?? Infinity) - (right.distance ?? Infinity));
}

function resolveAgent(game: ServerGame, playerId: GameId<'players'>) {
  return [...game.world.agents.values()].find((candidate) => candidate.playerId === playerId);
}

function normalizeOverlayData(game: ServerGame, playerId?: GameId<'players'>) {
  if (!playerId) {
    return null;
  }
  const player = game.world.players.get(playerId);
  if (!player) {
    return null;
  }
  const agent = resolveAgent(game, playerId);
  const decision = agent?.lastInteractionDecision;
  const map = game.worldMap;
  const currentAreaFromMap =
    (decision?.semanticContext?.currentArea &&
      map.zones.find((zone) => zone.id === decision.semanticContext?.currentArea?.id)) ||
    map.getZoneAt(player.position) ||
    undefined;
  const nearbyObjects =
    decision?.semanticContext?.nearbyObjects.map((object) => ({
      id: object.id,
      name: object.name,
      x: object.x,
      y: object.y,
      distance: object.distance,
    })) ?? buildFallbackNearbyObjects(map, player);
  const nearbyPlayers = decision?.semanticContext?.nearbyPlayers
    ? (decision.semanticContext.nearbyPlayers
        .map((candidate) => {
          const target = game.world.players.get(candidate.playerId as GameId<'players'>);
          if (!target) {
            return null;
          }
          return {
            id: candidate.playerId,
            x: target.position.x,
            y: target.position.y,
            distance: candidate.distance,
          };
        })
        .filter((candidate): candidate is OverlayPlayer => candidate !== null) as OverlayPlayer[])
    : buildFallbackNearbyPlayers(game, player);
  return {
    player,
    agent,
    decision,
    currentArea: currentAreaFromMap,
    nearbyObjects,
    nearbyPlayers,
  };
}

export function SemanticPerceptionOverlay({
  game,
  playerId,
}: {
  game: ServerGame;
  playerId?: GameId<'players'>;
}) {
  const overlay = useMemo(() => normalizeOverlayData(game, playerId), [game, playerId]);

  if (!overlay) {
    return null;
  }

  const { player, currentArea, nearbyObjects, nearbyPlayers, decision } = overlay;
  const tileDim = game.worldMap.tileDim;
  const areaBounds = currentArea?.bounds;
  const playerX = player.position.x * tileDim + tileDim / 2;
  const playerY = player.position.y * tileDim + tileDim / 2;
  const chosenDestination = decision?.chosenSemanticAction?.destination
    ? {
        x: decision.chosenSemanticAction.destination.x * tileDim + tileDim / 2,
        y: decision.chosenSemanticAction.destination.y * tileDim + tileDim / 2,
      }
    : undefined;

  return (
    <Container>
      {areaBounds && (
        <Graphics
          draw={(g: PIXI.Graphics) => {
            g.clear();
            const width = (areaBounds.maxX - areaBounds.minX + 1) * tileDim;
            const height = (areaBounds.maxY - areaBounds.minY + 1) * tileDim;
            g.lineStyle(2, 0xf5d76e, 0.95);
            g.beginFill(0xf5d76e, 0.08);
            g.drawRoundedRect(
              areaBounds.minX * tileDim,
              areaBounds.minY * tileDim,
              width,
              height,
              10,
            );
            g.endFill();
          }}
        />
      )}

      <Graphics
        draw={(g: PIXI.Graphics) => {
          g.clear();
          g.lineStyle(2, 0xf5d76e, 0.8);
          g.beginFill(0xf5d76e, 0.12);
          g.drawCircle(playerX, playerY, tileDim * 1.9);
          g.endFill();

          for (const object of nearbyObjects) {
            const objectX = object.x * tileDim + tileDim / 2;
            const objectY = object.y * tileDim + tileDim / 2;
            g.lineStyle(1.5, 0xffb347, 0.8);
            g.moveTo(playerX, playerY);
            g.lineTo(objectX, objectY);
            g.beginFill(0xffb347, 0.9);
            g.drawCircle(objectX, objectY, 5);
            g.endFill();
          }

          for (const target of nearbyPlayers) {
            const targetX = target.x * tileDim + tileDim / 2;
            const targetY = target.y * tileDim + tileDim / 2;
            g.lineStyle(1.5, 0x6ee7ff, 0.8);
            g.moveTo(playerX, playerY);
            g.lineTo(targetX, targetY);
            g.beginFill(0x6ee7ff, 0.95);
            g.drawCircle(targetX, targetY, 5);
            g.endFill();
          }

          if (chosenDestination) {
            g.lineStyle(2, 0xff6b6b, 0.95);
            g.drawCircle(chosenDestination.x, chosenDestination.y, tileDim * 0.35);
            g.moveTo(chosenDestination.x - 8, chosenDestination.y);
            g.lineTo(chosenDestination.x + 8, chosenDestination.y);
            g.moveTo(chosenDestination.x, chosenDestination.y - 8);
            g.lineTo(chosenDestination.x, chosenDestination.y + 8);
          }
        }}
      />

      <Text
        x={playerX}
        y={playerY - tileDim * 2.6}
        text={currentArea ? `区域：${currentArea.name}` : '区域：未命中'}
        anchor={{ x: 0.5, y: 1 }}
        style={
          new PIXI.TextStyle({
            fontFamily: 'monospace',
            fontSize: 12,
            fill: '#fff5cc',
            stroke: '#2d1b1b',
            strokeThickness: 3,
          })
        }
      />

      {nearbyObjects.slice(0, 4).map((object, index) => (
        <Text
          key={`semantic-object-${object.id}`}
          x={object.x * tileDim + tileDim / 2 + 10}
          y={object.y * tileDim + tileDim / 2 - index * 2}
          text={object.name}
          style={
            new PIXI.TextStyle({
              fontFamily: 'monospace',
              fontSize: 11,
              fill: '#ffd39a',
              stroke: '#2d1b1b',
              strokeThickness: 3,
            })
          }
        />
      ))}

      {nearbyPlayers.slice(0, 4).map((target) => (
        <Text
          key={`semantic-player-${target.id}`}
          x={target.x * tileDim + tileDim / 2 + 10}
          y={target.y * tileDim + tileDim / 2 - 18}
          text={target.id}
          style={
            new PIXI.TextStyle({
              fontFamily: 'monospace',
              fontSize: 11,
              fill: '#b8f6ff',
              stroke: '#2d1b1b',
              strokeThickness: 3,
            })
          }
        />
      ))}

      {decision?.chosenSemanticAction && (
        <Text
          x={playerX}
          y={playerY + tileDim * 1.7}
          text={`首选：${decision.chosenSemanticAction.label}`}
          anchor={{ x: 0.5, y: 0 }}
          style={
            new PIXI.TextStyle({
              fontFamily: 'monospace',
              fontSize: 11,
              fill: '#ffb6b6',
              stroke: '#2d1b1b',
              strokeThickness: 3,
            })
          }
        />
      )}
    </Container>
  );
}

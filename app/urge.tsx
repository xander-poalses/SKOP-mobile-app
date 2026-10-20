import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SkopColors, SkopFonts, skopShadow } from "@/constants/skop-theme";
import { useSkopSession } from "@/context/skop-session";
import {
  cellKey,
  directionFromSwipe,
  directionVector,
  Direction,
  GameRoute,
  generateRoute,
  GAME_FPS,
  GridPoint,
  GRID_ROWS,
  levelColour,
  levelTarget,
  routeWidthScale,
  SCORE_PER_CELL,
  stepDelay,
} from "@/lib/urge-game";

// this is the game state machine
// only one phase can be active, so the screen knows what it should show and run
type GamePhase = "ready" | "playing" | "transition" | "crashed";

// movement happens between two grid cells
// progress starts at 0 and reaches 1 when the marker arrives at the next cell
type MovementSegment = {
  from: GridPoint;
  to: GridPoint;
  progress: number;
  crashProgress?: number;
};

// the game uses grid units for its logic instead of screen pixels
// the values below control the marker, route drawing and level rest time
const INITIAL_PLAYER = { x: 1, y: 4 };
const MARKER_SCALE = 0.34;
const ROUTE_BORDER_WIDTH = 3;
const ROUTE_RADIUS = 4;
const ROUTE_SHADOW_Y = 6;
const LEVEL_TRANSITION_MS = 5000;
const COLLISION_TOLERANCE = 0.06;

// each route cell is a react native view
// this checks its neighbours so only corners on the edge of the route get rounded
function routeCellRadii(
  cell: GridPoint,
  safeCells: Set<string>,
  radius = ROUTE_RADIUS,
) {
  const hasTop = safeCells.has(cellKey({ x: cell.x, y: cell.y - 1 }));
  const hasRight = safeCells.has(cellKey({ x: cell.x + 1, y: cell.y }));
  const hasBottom = safeCells.has(cellKey({ x: cell.x, y: cell.y + 1 }));
  const hasLeft = safeCells.has(cellKey({ x: cell.x - 1, y: cell.y }));

  return {
    borderTopLeftRadius: !hasTop && !hasLeft ? radius : 0,
    borderTopRightRadius: !hasTop && !hasRight ? radius : 0,
    borderBottomRightRadius: !hasBottom && !hasRight ? radius : 0,
    borderBottomLeftRadius: !hasBottom && !hasLeft ? radius : 0,
  };
}

// collision points can contain decimals while route cells use whole grid numbers
// this checks the cells around a point and returns true when one belongs to the route
// padding grows the checked area for levels that use a wider route
function routeContainsPoint(
  point: GridPoint,
  safeCells: Set<string>,
  padding: number,
) {
  const firstX = Math.ceil(point.x - 1 - padding);
  const lastX = Math.floor(point.x + padding);
  const firstY = Math.ceil(point.y - 1 - padding);
  const lastY = Math.floor(point.y + padding);

  for (let x = firstX; x <= lastX; x += 1) {
    for (let y = firstY; y <= lastY; y += 1) {
      if (safeCells.has(cellKey({ x, y }))) return true;
    }
  }

  return false;
}

// checking only the marker centre would make it pass through walls
// this samples nine points across the marker and requires all of them to stay on the route
function markerFitsRoute(
  position: GridPoint,
  safeCells: Set<string>,
  padding: number,
) {
  const markerStart = (1 - MARKER_SCALE) / 2;
  const markerEnd = markerStart + MARKER_SCALE;
  const samples = [markerStart, 0.5, markerEnd];

  return samples.every((sampleX) =>
    samples.every((sampleY) =>
      routeContainsPoint(
        { x: position.x + sampleX, y: position.y + sampleY },
        safeCells,
        padding,
      ),
    ),
  );
}

// collision gets a small margin so border pixels do not count as a wall
function collisionPadding(level: number) {
  return Math.max(0, routeWidthScale(level) - 1 + COLLISION_TOLERANCE);
}

// a blocked grid step may hit a wall before reaching the next cell
// this searches between the start and end positions to find the point of contact
// the first loop finds a safe and blocked range, then the second loop narrows that range
function findWallContact(
  from: GridPoint,
  to: GridPoint,
  route: GameRoute,
  padding: number,
) {
  const positionAt = (progress: number) => ({
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  });
  let safeProgress = 0;
  let blockedProgress = 0.25;

  while (
    blockedProgress < 3 &&
    markerFitsRoute(positionAt(blockedProgress), route.safeCells, padding)
  ) {
    safeProgress = blockedProgress;
    blockedProgress += 0.25;
  }

  for (let step = 0; step < 10; step += 1) {
    const midpoint = (safeProgress + blockedProgress) / 2;
    if (markerFitsRoute(positionAt(midpoint), route.safeCells, padding))
      safeProgress = midpoint;
    else blockedProgress = midpoint;
  }

  return safeProgress;
}

// each generated route cell stores how far the user has travelled
// this reads that value so movement along the route can become a score
// wider route cells may not have a direct match, so nearby cells are checked as a fallback
function routeProgressAt(
  position: GridPoint,
  route: GameRoute,
  padding: number,
) {
  const directProgress = route.progressByCell.get(cellKey(position));
  if (directProgress !== undefined) return directProgress;

  const searchRadius = Math.ceil(padding) + 1;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestProgress = 0;

  for (
    let x = position.x - searchRadius;
    x <= position.x + searchRadius;
    x += 1
  ) {
    for (
      let y = position.y - searchRadius;
      y <= position.y + searchRadius;
      y += 1
    ) {
      const progress = route.progressByCell.get(cellKey({ x, y }));
      if (progress === undefined) continue;

      const distance = (position.x - x) ** 2 + (position.y - y) ** 2;
      if (
        distance < nearestDistance ||
        (distance === nearestDistance && progress > nearestProgress)
      ) {
        nearestDistance = distance;
        nearestProgress = progress;
      }
    }
  }

  return nearestProgress;
}

export default function UrgeGameScreen() {
  // this context shares results with the rest of the skop app
  const { completeSession, highScore, recordHighScore } = useSkopSession();

  // state is used when a value must cause the screen to render again
  // phase controls the game flow and route stores the generated map
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [route, setRoute] = useState<GameRoute>(() => generateRoute());
  const [playerPosition, setPlayerPosition] =
    useState<GridPoint>(INITIAL_PLAYER);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [transitionElapsedMs, setTransitionElapsedMs] = useState(0);
  const [boardSize, setBoardSize] = useState({ width: 760, height: 300 });

  // smaller landscape screens use a header with less height and width
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const compactGame = windowWidth < 700 || windowHeight < 420;

  // refs store values used by the game loop
  // changing a ref does not render the component, so input and movement can update without delay
  // the current value is read and changed through the ref's current property
  const sessionStartedAt = useRef<number | null>(null);
  const completedSession = useRef(false);
  const sessionBestScoreRef = useRef(0);
  const sessionHighestLevelRef = useRef(1);
  const crashHapticPlayedRef = useRef(false);
  const scoreRef = useRef(0);
  const directionRef = useRef<Direction>("right");
  const queuedDirectionRef = useRef<Direction | null>(null);
  const swipeHandledRef = useRef(false);
  const transitionStartedAt = useRef(0);
  const segmentRef = useRef<MovementSegment>({
    from: INITIAL_PLAYER,
    to: { x: INITIAL_PLAYER.x + 1, y: INITIAL_PLAYER.y },
    progress: 0,
  });
  const completeSessionRef = useRef(completeSession);
  const recordHighScoreRef = useRef(recordHighScore);

  useEffect(() => {
    completeSessionRef.current = completeSession;
    recordHighScoreRef.current = recordHighScore;
  }, [completeSession, recordHighScore]);

  // every exit path calls this, so one urge-screen visit makes one record
  const saveSession = useCallback(() => {
    if (sessionStartedAt.current === null || completedSession.current) return;
    completedSession.current = true;

    const endedAt = new Date();
    const durationSeconds = Math.max(
      1,
      Math.floor((endedAt.getTime() - sessionStartedAt.current) / 1000),
    );
    const bestScore = Math.max(sessionBestScoreRef.current, scoreRef.current);

    recordHighScoreRef.current(bestScore);
    completeSessionRef.current({
      startedAt: new Date(sessionStartedAt.current).toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds,
      score: bestScore,
      highestLevel: sessionHighestLevelRef.current,
    });
  }, []);

  // usecallback keeps the same function between renders
  // this matters because the game effect lists this function as a dependency
  // the function resets the direction, movement segment and marker position
  const resetMovement = useCallback(() => {
    crashHapticPlayedRef.current = false;
    directionRef.current = "right";
    queuedDirectionRef.current = null;
    segmentRef.current = {
      from: INITIAL_PLAYER,
      to: { x: INITIAL_PLAYER.x + 1, y: INITIAL_PLAYER.y },
      progress: 0,
    };
    setPlayerPosition(INITIAL_PLAYER);
  }, []);

  // an effect runs after the screen mounts
  // the returned cleanup function runs when the user leaves the screen
  // this locks the game to landscape and gives control back to the device on exit
  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    ).catch(() => undefined);
    return () => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
    };
  }, []);

  // back gestures and route changes still save the active urge session
  useEffect(() => {
    return () => saveSession();
  }, [saveSession]);

  // this timer compares the current time with the time the screen opened
  // setsessionseconds causes the timer text to render once per second
  // clearinterval stops the timer when the screen unmounts
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionStartedAt.current === null) return;
      setSessionSeconds(Math.floor((Date.now() - sessionStartedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // this effect is the game loop
  // it runs frames at game_fps while the marker is playing or moving through a rest section
  // each frame works out elapsed time, movement, score, turns and collisions
  useEffect(() => {
    if (phase !== "playing" && phase !== "transition") return;

    let lastFrameAt = Date.now();

    // dividing one second by the frame count gives the wait between frames
    const frameDuration = 1000 / GAME_FPS;
    const timer = setInterval(() => {
      const now = Date.now();

      // elapsed time keeps movement steady when a frame takes more time than planned
      // the 100ms limit stops one stalled frame from moving the marker across many cells
      const elapsed = Math.min(100, now - lastFrameAt);
      lastFrameAt = now;

      let segment = segmentRef.current;
      let segmentProgress =
        segment.progress +
        elapsed / (phase === "transition" ? 300 : stepDelay(level));

      // this places the marker at the saved point of contact
      // it records the score and changes phase so the crash dialog can render
      const crashAtWall = () => {
        if (!crashHapticPlayedRef.current) {
          crashHapticPlayedRef.current = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        }

        const crashProgress = segment.crashProgress ?? 1;
        segment.progress = crashProgress;
        segmentRef.current = segment;
        setPlayerPosition({
          x: segment.from.x + (segment.to.x - segment.from.x) * crashProgress,
          y: segment.from.y + (segment.to.y - segment.from.y) * crashProgress,
        });
        recordHighScoreRef.current(scoreRef.current);
        setPhase("crashed");
      };

      // a crash segment keeps moving until it reaches its wall contact value
      if (
        segment.crashProgress !== undefined &&
        segmentProgress >= segment.crashProgress
      ) {
        crashAtWall();
        return;
      }

      if (segment.crashProgress !== undefined) {
        segment.progress = segmentProgress;
        segmentRef.current = segment;
        setPlayerPosition({
          x: segment.from.x + (segment.to.x - segment.from.x) * segmentProgress,
          y: segment.from.y + (segment.to.y - segment.from.y) * segmentProgress,
        });
        return;
      }

      // more than one cell can be crossed when a frame arrives late
      // the loop handles every completed cell before drawing the marker
      while (segmentProgress >= 1) {
        const arrived = segment.to;
        segmentProgress -= 1;

        // score comes from route distance, not time
        // reaching the level target starts the five second transition section
        if (phase === "playing") {
          const routePadding = routeWidthScale(level) - 1;
          const routeProgress = routeProgressAt(arrived, route, routePadding);
          const nextScore = Math.max(
            scoreRef.current,
            routeProgress * SCORE_PER_CELL,
          );

          if (nextScore !== scoreRef.current) {
            scoreRef.current = nextScore;
            sessionBestScoreRef.current = Math.max(
              sessionBestScoreRef.current,
              nextScore,
            );
            setScore(nextScore);
          }

          if (nextScore >= levelTarget(level)) {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            transitionStartedAt.current = Date.now();
            setTransitionElapsedMs(0);
            directionRef.current = "right";
            queuedDirectionRef.current = null;
            segmentRef.current = {
              from: arrived,
              to: { x: arrived.x + 1, y: arrived.y },
              progress: 0,
            };
            setPlayerPosition(arrived);
            setPhase("transition");
            return;
          }
        }

        // swipes are queued so turns happen on grid cell boundaries
        // this keeps the marker aligned to up, down, left and right movement
        const queuedDirection = queuedDirectionRef.current;

        // this looks one cell ahead before movement starts
        // the move is allowed when the marker fits the route and the cell has no obstacle
        const canMove = (candidate: Direction) => {
          const vector = directionVector[candidate];
          const candidatePoint = {
            x: arrived.x + vector.x,
            y: arrived.y + vector.y,
          };
          const candidateKey = cellKey(candidatePoint);
          const collisionLevel = phase === "transition" ? level + 1 : level;
          const routePadding = collisionPadding(collisionLevel);
          return (
            markerFitsRoute(candidatePoint, route.safeCells, routePadding) &&
            !route.obstacleCells.has(candidateKey)
          );
        };

        // a queued swipe becomes the movement direction when that turn is open
        if (
          phase !== "transition" &&
          queuedDirection &&
          canMove(queuedDirection)
        ) {
          directionRef.current = queuedDirection;
          queuedDirectionRef.current = null;
        }

        // rest sections force right movement so they feel like part of the same route
        const activeDirection: Direction =
          phase === "transition" ? "right" : directionRef.current;
        if (!canMove(activeDirection)) {
          const vector = directionVector[activeDirection];
          const target = { x: arrived.x + vector.x, y: arrived.y + vector.y };
          const targetKey = cellKey(target);
          const collisionLevel = phase === "transition" ? level + 1 : level;
          const routePadding = collisionPadding(collisionLevel);
          const wallContact = findWallContact(
            arrived,
            target,
            route,
            routePadding,
          );

          // obstacles use a set contact point while walls use the point found by the search
          const collisionProgress = route.obstacleCells.has(targetKey)
            ? 0.54
            : wallContact;
          segment = {
            from: arrived,
            to: target,
            progress: 0,
            crashProgress: collisionProgress,
          };

          if (segmentProgress >= collisionProgress) {
            crashAtWall();
            return;
          }
          break;
        }

        const vector = directionVector[activeDirection];
        segment = {
          from: arrived,
          to: { x: arrived.x + vector.x, y: arrived.y + vector.y },
          progress: 0,
        };
      }

      // interpolation turns grid movement into motion between cells
      // from plus the distance to to multiplied by progress gives the frame position
      segment.progress = segmentProgress;
      segmentRef.current = segment;
      setPlayerPosition({
        x: segment.from.x + (segment.to.x - segment.from.x) * segmentProgress,
        y: segment.from.y + (segment.to.y - segment.from.y) * segmentProgress,
      });
    }, frameDuration);

    return () => clearInterval(timer);
  }, [level, phase, resetMovement, route]);

  // this timer only runs during the level transition
  // it updates the message and starts the next level after five seconds
  // the route is not replaced, so the screen keeps moving along the same path
  useEffect(() => {
    if (phase !== "transition") return;

    const updateTransition = () => {
      const elapsed = Math.min(
        LEVEL_TRANSITION_MS,
        Date.now() - transitionStartedAt.current,
      );
      setTransitionElapsedMs(elapsed);

      if (elapsed < LEVEL_TRANSITION_MS) return;

      setLevel((current) => {
        const nextLevel = current + 1;
        sessionHighestLevelRef.current = Math.max(
          sessionHighestLevelRef.current,
          nextLevel,
        );
        return nextLevel;
      });
      setPhase("playing");
    };

    const timer = setInterval(updateTransition, 100);
    updateTransition();

    return () => {
      clearInterval(timer);
    };
  }, [phase]);

  // dx is horizontal finger travel and dy is vertical finger travel
  // the first right swipe starts the run while later swipes queue a turn
  const onSwipe = useCallback(
    (dx: number, dy: number) => {
      const nextDirection = directionFromSwipe(dx, dy);
      if (!nextDirection) return;

      if (phase === "ready") {
        if (nextDirection === "right") {
          if (sessionStartedAt.current === null) {
            sessionStartedAt.current = Date.now();
            setSessionSeconds(0);
          }
          setPhase("playing");
        }
        return;
      }

      if (phase === "playing") queuedDirectionRef.current = nextDirection;
    },
    [phase],
  );

  // panresponder turns touch movement into gesture data
  // usememo keeps one responder until the phase or swipe handler changes
  // six pixels is enough movement for the screen to treat the touch as a swipe
  const panResponder = useMemo(
    () => {
      // pan responder keeps gesture state in refs to avoid rendering on every touch move
      // eslint-disable-next-line react-hooks/refs
      return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          (phase === "ready" || phase === "playing") &&
          Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >= 6,
        // grant runs when the board takes control of the touch
        onPanResponderGrant: (_, gesture) => {
          swipeHandledRef.current = false;
          if (directionFromSwipe(gesture.dx, gesture.dy)) {
            onSwipe(gesture.dx, gesture.dy);
            swipeHandledRef.current = true;
          }
        },
        // move catches the direction before the finger leaves the screen
        onPanResponderMove: (_, gesture) => {
          if (
            !swipeHandledRef.current &&
            directionFromSwipe(gesture.dx, gesture.dy)
          ) {
            onSwipe(gesture.dx, gesture.dy);
            swipeHandledRef.current = true;
          }
        },
        // release handles swipes that were not caught during movement
        onPanResponderRelease: (_, gesture) => {
          if (!swipeHandledRef.current) onSwipe(gesture.dx, gesture.dy);
          swipeHandledRef.current = false;
        },
        onPanResponderTerminate: () => {
          swipeHandledRef.current = false;
        },
      });
    },
    [onSwipe, phase],
  );

  // respawn resets the run instead of removing a life
  // it creates another route and returns the game to the start prompt
  const respawn = () => {
    const nextRoute = generateRoute();
    scoreRef.current = 0;
    setScore(0);
    setLevel(1);
    setRoute(nextRoute);
    resetMovement();
    setPhase("ready");
  };

  // leaving saves one session when the player has started moving
  const finishSession = async () => {
    saveSession();
    // lets android finish leaving landscape before the home screen renders
    await ScreenOrientation.unlockAsync().catch(() => undefined);
    router.replace("/");
  };

  // the close and leave buttons return home without another prompt
  const requestLeave = () => {
    void finishSession();
  };

  // onlayout gives the measured width and height after react native lays out the board
  // the game uses those values to turn grid units into screen pixels
  const onBoardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardSize({ width, height });
  };

  // cellsize is the pixel size of one grid cell on this device
  // camerax is the point where the marker stays while route cells move around it
  const cellSize = Math.min(boardSize.height / GRID_ROWS, boardSize.width / 22);
  const cameraX = boardSize.width * 0.27;
  const gridTop = (boardSize.height - GRID_ROWS * cellSize) / 2;

  // only cells near the marker are rendered
  // this avoids creating views for the full route on every frame
  const visibleCells = route.cells.filter(
    (cell) => Math.abs(cell.x - playerPosition.x) < 16,
  );
  const visibleObstacles = route.obstacles.filter(
    (cell) => Math.abs(cell.x - playerPosition.x) < 16,
  );

  // these values control the colour and width used for the level on screen
  const displayedLevel = phase === "transition" ? level + 1 : level;
  const routeColour = levelColour(displayedLevel);
  const routeScale = routeWidthScale(displayedLevel);
  const routeOutset = (routeScale - 1) * cellSize;
  const outlineOutset = routeOutset + ROUTE_BORDER_WIDTH;
  // math.max lets the high score update on screen during the current run
  const displayedHighScore = Math.max(highScore, score);
  const levelBaseScore = level === 1 ? 0 : levelTarget(level - 1);
  const levelScoreRange = levelTarget(level) - levelBaseScore;
  // the score is changed into a percentage for the progress bar width
  const levelProgress =
    phase === "transition"
      ? 0
      : Math.min(
          100,
          Math.max(0, ((score - levelBaseScore) / levelScoreRange) * 100),
        );
  const transitionSeconds = Math.max(
    1,
    Math.ceil((LEVEL_TRANSITION_MS - transitionElapsedMs) / 1000),
  );
  // the five second transition has three messages but stays in one phase
  const transitionStage =
    transitionElapsedMs < 900
      ? "complete"
      : transitionElapsedMs < 4100
        ? "rest"
        : "ready";

  return (
    // safeareaview stops landscape content touching the screen cutout and side controls
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={[styles.header, compactGame && styles.compactHeader]}>
          <View
            style={[styles.brandBlock, compactGame && styles.compactBrandBlock]}
          >
            <View
              style={[styles.logoWrap, compactGame && styles.compactLogoWrap]}
            >
              <Image
                source={require("../assets/images/Favicon-NoBackground.png")}
                style={[styles.logo, compactGame && styles.compactLogo]}
                contentFit="contain"
              />
            </View>
            <View>
              <Text style={[styles.title, compactGame && styles.compactTitle]}>
                BREAKOUT
              </Text>
              <Text
                style={[
                  styles.level,
                  compactGame && styles.compactLevel,
                  { color: routeColour },
                ]}
              >
                LEVEL {displayedLevel}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.sessionTime,
              compactGame && styles.compactSessionTime,
            ]}
          >
            {formatTime(sessionSeconds)}
          </Text>

          <View
            style={[
              styles.scoreBlock,
              compactGame && styles.compactScoreBlock,
            ]}
          >
            <Text
              style={[
                styles.score,
                compactGame && styles.compactScore,
                { color: routeColour },
              ]}
            >
              {score}
            </Text>
            <Text
              style={[
                styles.highScore,
                compactGame && styles.compactHighScore,
              ]}
            >
              {displayedHighScore}
            </Text>
          </View>
        </View>

        {/* the board receives swipes and clips route parts outside its bounds */}
        <View
          style={styles.board}
          onLayout={onBoardLayout}
          {...panResponder.panHandlers}
        >
          <Pressable
            accessibilityLabel="Leave urge session"
            accessibilityRole="button"
            hitSlop={8}
            onPress={requestLeave}
            style={({ pressed }) => [
              styles.exitButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="close" size={22} color={SkopColors.surface} />
          </Pressable>
          {/* each route cell gets a shadow view placed four pixels below it */}
          {visibleCells.map((cell) => (
            <View
              key={`shadow-${cellKey(cell)}`}
              pointerEvents="none"
              style={[
                styles.routeShadowCell,
                routeCellRadii(cell, route.safeCells),
                {
                  height: cellSize + outlineOutset * 2 + 1,
                  left:
                    cameraX +
                    (cell.x - playerPosition.x) * cellSize -
                    outlineOutset,
                  top: gridTop + cell.y * cellSize - outlineOutset,
                  width: cellSize + outlineOutset * 2 + 1,
                },
              ]}
            />
          ))}
          {/* the outline layer sits above the shadow and adds the ink border */}
          {visibleCells.map((cell) => (
            <View
              key={`outline-${cellKey(cell)}`}
              pointerEvents="none"
              style={[
                styles.routeOutlineCell,
                routeCellRadii(cell, route.safeCells),
                {
                  height: cellSize + outlineOutset * 2 + 1,
                  left:
                    cameraX +
                    (cell.x - playerPosition.x) * cellSize -
                    outlineOutset,
                  top: gridTop + cell.y * cellSize - outlineOutset,
                  width: cellSize + outlineOutset * 2 + 1,
                },
              ]}
            />
          ))}
          {/* the colour layer sits inside the outline and changes with the level */}
          {visibleCells.map((cell) => (
            <View
              key={cellKey(cell)}
              pointerEvents="none"
              style={[
                styles.routeCell,
                routeCellRadii(
                  cell,
                  route.safeCells,
                  Math.max(0, ROUTE_RADIUS - ROUTE_BORDER_WIDTH),
                ),
                {
                  backgroundColor: routeColour,
                  height: cellSize + routeOutset * 2 + 1,
                  left:
                    cameraX +
                    (cell.x - playerPosition.x) * cellSize -
                    routeOutset,
                  top: gridTop + cell.y * cellSize - routeOutset,
                  width: cellSize + routeOutset * 2 + 1,
                },
              ]}
            />
          ))}
          {/* obstacles use the same camera maths as route cells */}
          {visibleObstacles.map((cell) => (
            <View
              key={`obstacle-${cellKey(cell)}`}
              style={[
                styles.obstacle,
                {
                  height: cellSize * 0.58,
                  left:
                    cameraX +
                    (cell.x - playerPosition.x) * cellSize +
                    cellSize * 0.21,
                  top: gridTop + cell.y * cellSize + cellSize * 0.21,
                  width: cellSize * 0.58,
                },
              ]}
            />
          ))}
          {/* the marker x stays at the camera point while its y follows the grid */}
          <View
            style={[
              styles.marker,
              {
                backgroundColor:
                  routeColour === SkopColors.pink
                    ? SkopColors.blue
                    : SkopColors.pink,
                height: cellSize * MARKER_SCALE,
                left: cameraX + cellSize * ((1 - MARKER_SCALE) / 2),
                top:
                  gridTop +
                  playerPosition.y * cellSize +
                  cellSize * ((1 - MARKER_SCALE) / 2),
                width: cellSize * MARKER_SCALE,
              },
            ]}
          />

          {/* this prompt only exists during the ready phase */}
          {phase === "ready" && (
            <View style={styles.startPrompt} pointerEvents="none">
              <Image
                source={require("../assets/figma/game-swipe-hand.svg")}
                style={styles.swipeHand}
              />
            </View>
          )}

          {/* this message sits on the board instead of opening a modal */}
          {phase === "transition" && (
            <View style={styles.transitionMessage} pointerEvents="none">
              <Text style={styles.transitionEyebrow}>
                {transitionStage === "complete"
                  ? `LEVEL ${level} COMPLETE`
                  : transitionStage === "rest"
                    ? "REST"
                    : "GET READY"}
              </Text>
              <Text style={styles.transitionTitle}>LEVEL {level + 1}</Text>
              <View style={styles.transitionCountSlot}>
                <Text style={styles.transitionCount}>
                  {transitionStage === "complete"
                    ? "ROUTE CLEARED"
                    : transitionSeconds}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* a percentage string changes the fill width without changing the rail width */}
        <View style={styles.progressRail}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: routeColour,
                width: `${levelProgress}%`,
              },
            ]}
          />
        </View>

        {/* changing phase to crashed adds this dialog over the game */}
        {phase === "crashed" && (
          <GameDialog title="ROUTE LOST" body={`Score ${score}`}>
            <DialogButton
              label="RESPAWN"
              colour={routeColour}
              onPress={respawn}
            />
            <DialogButton
              label="LEAVE"
              colour={SkopColors.surface}
              onPress={requestLeave}
            />
          </GameDialog>
        )}

      </View>
    </SafeAreaView>
  );
}

// children lets each dialog pass in its own set of buttons
// the frame, title and body stay the same across game dialogs
function GameDialog({
  children,
  title,
  body,
}: {
  children: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.dialogBackdrop}>
      <View style={styles.dialog}>
        <Text style={styles.dialogTitle}>{title}</Text>
        <Text style={styles.dialogBody}>{body}</Text>
        <View style={styles.dialogActions}>{children}</View>
      </View>
    </View>
  );
}

// this component keeps the dialog actions the same size and press behaviour
// colour and onpress are passed in as props because each action does a different job
function DialogButton({
  label,
  colour,
  onPress,
}: {
  label: string;
  colour: string;
  onPress: () => void;
}) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.dialogButton,
        { backgroundColor: colour },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.dialogButtonText}>{label}</Text>
    </Pressable>
  );
}

// padstart adds a zero when minutes or seconds only use one digit
// this turns 65 seconds into the timer text 01:05
function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// stylesheet.create stores react native style objects
// there are no css selectors, so each view receives its style through the style prop
const styles = StyleSheet.create({
  // flex 1 makes the screen and shell use all space given by the route
  screen: { flex: 1, backgroundColor: SkopColors.background },
  shell: {
    flex: 1,
    backgroundColor: SkopColors.background,
    overflow: "hidden",
  },
  header: {
    height: 96,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactHeader: { height: 70, paddingHorizontal: 12 },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 255,
  },
  compactBrandBlock: { gap: 8, minWidth: 180 },
  logoWrap: { width: 46, height: 46 },
  compactLogoWrap: { width: 36, height: 36 },
  logo: { width: 46, height: 46 },
  compactLogo: { width: 36, height: 36 },
  title: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 34,
    lineHeight: 34,
  },
  compactTitle: { fontSize: 24, lineHeight: 24 },
  level: { fontFamily: SkopFonts.score, fontSize: 25, lineHeight: 27 },
  compactLevel: { fontSize: 18, lineHeight: 20 },
  sessionTime: {
    minWidth: 92,
    color: SkopColors.ink,
    fontFamily: SkopFonts.scoreAlt,
    fontSize: 27,
    textAlign: "center",
  },
  compactSessionTime: { minWidth: 70, fontSize: 21 },
  scoreBlock: { minWidth: 140, alignItems: "flex-end" },
  compactScoreBlock: { minWidth: 100 },
  score: { fontFamily: SkopFonts.score, fontSize: 34, lineHeight: 36 },
  compactScore: { fontSize: 25, lineHeight: 27 },
  highScore: {
    color: "#8bb2b4",
    fontFamily: SkopFonts.scoreAlt,
    fontSize: 24,
    lineHeight: 25,
  },
  compactHighScore: { fontSize: 18, lineHeight: 20 },
  // route parts use absolute positions inside this relative board
  board: { flex: 1, overflow: "hidden", position: "relative" },
  exitButton: {
    position: "absolute",
    left: 8,
    top: "42%",
    width: 32,
    height: 48,
    borderRadius: 8,
    backgroundColor: SkopColors.ink,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // each route layer uses the same position but a different z index
  routeShadowCell: {
    position: "absolute",
    backgroundColor: SkopColors.shadow,
    transform: [{ translateX: 0 }, { translateY: ROUTE_SHADOW_Y }],
    zIndex: 0,
  },
  routeOutlineCell: {
    position: "absolute",
    backgroundColor: SkopColors.ink,
    zIndex: 1,
  },
  routeCell: {
    position: "absolute",
    zIndex: 2,
  },
  obstacle: {
    position: "absolute",
    backgroundColor: SkopColors.ink,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: SkopColors.surface,
  },
  marker: {
    position: "absolute",
    borderRadius: 3,
    borderWidth: 1,
    borderColor: SkopColors.ink,
    zIndex: 4,
  },
  startPrompt: {
    position: "absolute",
    left: 22,
    bottom: 10,
    width: 162,
    height: 88,
  },
  swipeHand: {
    width: 162,
    height: 88,
  },
  progressRail: {
    height: 8,
    marginHorizontal: 22,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SkopColors.ink,
  },
  progressFill: { height: "100%" },
  transitionMessage: {
    position: "absolute",
    right: 28,
    top: 18,
    minWidth: 230,
    alignItems: "flex-end",
    zIndex: 6,
  },
  transitionEyebrow: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.medium,
    fontSize: 13,
  },
  transitionTitle: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 38,
  },
  transitionCountSlot: {
    height: 34,
    minWidth: 190,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  transitionCount: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.score,
    fontSize: 24,
  },
  // absolutefillobject sets top, right, bottom and left to zero
  dialogBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    backgroundColor: "rgba(33,23,18,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 390,
    maxWidth: "78%",
    backgroundColor: SkopColors.background,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    ...skopShadow,
  },
  dialogTitle: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 28,
    textAlign: "center",
  },
  dialogBody: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.body,
    fontSize: 16,
    marginTop: 5,
    textAlign: "center",
  },
  dialogActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  dialogButton: {
    minWidth: 112,
    height: 43,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    ...skopShadow,
  },
  dialogButtonText: {
    color: SkopColors.ink,
    fontFamily: SkopFonts.bold,
    fontSize: 14,
  },
  buttonPressed: {
    transform: [{ translateY: 3 }],
    boxShadow: `0px 1px 0px 0px ${SkopColors.shadow}`,
  },
});

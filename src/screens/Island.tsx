import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Coins,
  RotateCw,
  Sun,
  Sunset,
  Moon,
  Lock,
  Check,
  Sparkles,
  Edit3,
  ShoppingBag,
  Info,
} from 'lucide-react';
import {
  Habit,
  HabitCompletion,
  FocusSession,
  IslandState,
  AccentColorId,
} from '../types/habit';
import { ACCENT_PALETTES, hexWithAlpha } from '../utils/themes';
import { calculateIslandLedger } from '../utils/habitLogic';
import { getTodayDateString } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';
import { CelebrationBurst } from '../components/CelebrationBurst';

interface IslandScreenProps {
  habits: Habit[];
  completions: HabitCompletion[];
  focusSessions: FocusSession[];
  islandState: IslandState;
  accentColor: AccentColorId;
  isDark: boolean;
  onUpdateIslandState: (next: IslandState) => void;
}

export interface VoxelPieceCatalogItem {
  id: string;
  name: string;
  region: string;
  price: number;
  description: string;
  /** Isometric position on the island canvas (0..100%) */
  x: number;
  y: number;
  /** Primary voxel colors: [topFace, leftFace, rightFace, accentColor] */
  colors: [string, string, string, string];
  kind:
    | 'villa'
    | 'lighthouse'
    | 'grove'
    | 'boat'
    | 'chapel'
    | 'windmill'
    | 'pier'
    | 'terrace'
    | 'arch'
    | 'taverna'
    | 'ship'
    | 'altar';
}

export const VOXEL_ISLAND_CATALOG: VoxelPieceCatalogItem[] = [
  {
    id: 'pueblo_villa',
    name: 'Whitewashed Villa',
    region: 'Pueblo',
    price: 120,
    description: 'Cycladic cube house with azure shutters and bougainvillea.',
    x: 42,
    y: 44,
    colors: ['#F8FAFC', '#E2E8F0', '#CBD5E1', '#38BDF8'],
    kind: 'villa',
  },
  {
    id: 'cala_lighthouse',
    name: 'Aegean Lighthouse',
    region: 'Faro',
    price: 180,
    description: 'Stone beacon guiding evening sails into the cove.',
    x: 76,
    y: 34,
    colors: ['#F8FAFC', '#E2E8F0', '#94A3B8', '#F59E0B'],
    kind: 'lighthouse',
  },
  {
    id: 'huerta_olive',
    name: 'Olive & Cypress Grove',
    region: 'Huerta',
    price: 150,
    description: 'Ancient silver-leaf olive trees on terraced stone.',
    x: 28,
    y: 52,
    colors: ['#4ADE80', '#22C55E', '#15803D', '#A16207'],
    kind: 'grove',
  },
  {
    id: 'caleta_boat',
    name: 'Fishing Kaiki Boat',
    region: 'Caleta',
    price: 160,
    description: 'Traditional wooden hull bobbing in crystal turquoise water.',
    x: 22,
    y: 74,
    colors: ['#F8FAFC', '#EF4444', '#1D4ED8', '#FBBF24'],
    kind: 'boat',
  },
  {
    id: 'ermita_chapel',
    name: 'Blue-Domed Chapel',
    region: 'Ermita',
    price: 280,
    description: 'Iconic Cycladic hillside chapel with a cobalt dome.',
    x: 52,
    y: 30,
    colors: ['#F8FAFC', '#E2E8F0', '#CBD5E1', '#0284C7'],
    kind: 'chapel',
  },
  {
    id: 'molino_windmill',
    name: 'Mykonos Windmill',
    region: 'Molino',
    price: 320,
    description: 'Thatched-roof stone mill catching the northern breeze.',
    x: 64,
    y: 42,
    colors: ['#F8FAFC', '#E2E8F0', '#CBD5E1', '#D97706'],
    kind: 'windmill',
  },
  {
    id: 'puerto_pier',
    name: 'Stone Harbor Pier',
    region: 'Puerto',
    price: 240,
    description: 'Warm limestone jetty with lanterns along the water.',
    x: 58,
    y: 72,
    colors: ['#FDE68A', '#F59E0B', '#B45309', '#38BDF8'],
    kind: 'pier',
  },
  {
    id: 'terrazas_vineyard',
    name: 'Sunlit Stone Terraces',
    region: 'Terrazas',
    price: 220,
    description: 'Dry-stone hillside steps planted with Mediterranean vines.',
    x: 34,
    y: 36,
    colors: ['#86EFAC', '#4ADE80', '#16A34A', '#D6D3D1'],
    kind: 'terrace',
  },
  {
    id: 'mirador_arch',
    name: 'Cliffside Bell Arch',
    region: 'Mirador',
    price: 350,
    description: 'High lookout arch overlooking the open Aegean horizon.',
    x: 48,
    y: 20,
    colors: ['#F8FAFC', '#E2E8F0', '#94A3B8', '#FBBF24'],
    kind: 'arch',
  },
  {
    id: 'pueblo_taverna',
    name: 'Harborfront Taverna',
    region: 'Pueblo',
    price: 420,
    description: 'Lantern-lit pergola courtyard by the old harbor steps.',
    x: 46,
    y: 58,
    colors: ['#FEF3C7', '#FDE68A', '#D97706', '#EF4444'],
    kind: 'taverna',
  },
  {
    id: 'astillero_ship',
    name: 'Wooden Schooner',
    region: 'Astillero',
    price: 500,
    description: 'Two-masted timber vessel anchored off the eastern cove.',
    x: 78,
    y: 66,
    colors: ['#D97706', '#B45309', '#78350F', '#F8FAFC'],
    kind: 'ship',
  },
  {
    id: 'cabo_sanctuary',
    name: 'Ancient Marble Altar',
    region: 'Cabo',
    price: 650,
    description: 'Classical Doric columns crowning the highest promontory.',
    x: 68,
    y: 24,
    colors: ['#FEF9C3', '#FDE047', '#CA8A04', '#38BDF8'],
    kind: 'altar',
  },
];

/**
 * Isometric 3D Voxel Cube helper inside SVG
 */
const IsoBox: React.FC<{
  cx: number;
  cy: number;
  w: number;
  d: number;
  h: number;
  top: string;
  left: string;
  right: string;
}> = ({ cx, cy, w, d, h, top, left, right }) => {
  // Isometric projection vectors
  const topPts = `${cx},${cy - h - d} ${cx + w},${cy - h} ${cx},${cy - h + d} ${cx - w},${cy - h}`;
  const leftPts = `${cx - w},${cy - h} ${cx},${cy - h + d} ${cx},${cy + d} ${cx - w},${cy}`;
  const rightPts = `${cx},${cy - h + d} ${cx + w},${cy - h} ${cx + w},${cy} ${cx},${cy + d}`;

  return (
    <g>
      <polygon points={leftPts} fill={left} />
      <polygon points={rightPts} fill={right} />
      <polygon points={topPts} fill={top} />
    </g>
  );
};

export const IslandScreen: React.FC<IslandScreenProps> = ({
  habits,
  completions,
  focusSessions,
  islandState,
  accentColor,
  isDark,
  onUpdateIslandState,
}) => {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const todayStr = getTodayDateString();

  const [selectedPieceId, setSelectedPieceId] = useState<string>(
    VOXEL_ISLAND_CATALOG[4].id
  );
  const [burstPieceId, setBurstPieceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>(islandState.name);
  const [showLedgerInfo, setShowLedgerInfo] = useState<boolean>(false);

  const ledger = useMemo(
    () => calculateIslandLedger(habits, completions, focusSessions, todayStr),
    [habits, completions, focusSessions, todayStr]
  );

  const spentCoins = useMemo(() => {
    return islandState.unlockedIds.reduce((sum, id) => {
      const item = VOXEL_ISLAND_CATALOG.find((p) => p.id === id);
      return sum + (item ? item.price : 0);
    }, 0);
  }, [islandState.unlockedIds]);

  const availableCoins = Math.max(0, ledger.totalEarned - spentCoins);

  const selectedPiece =
    VOXEL_ISLAND_CATALOG.find((p) => p.id === selectedPieceId) ||
    VOXEL_ISLAND_CATALOG[0];
  const isSelectedOwned = islandState.unlockedIds.includes(selectedPiece.id);

  const handleBuyPiece = (piece: VoxelPieceCatalogItem) => {
    if (islandState.unlockedIds.includes(piece.id)) return;
    if (availableCoins < piece.price) {
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('success');
    setBurstPieceId(piece.id);
    window.setTimeout(() => setBurstPieceId(null), 900);

    onUpdateIslandState({
      ...islandState,
      unlockedIds: [...islandState.unlockedIds, piece.id],
    });
  };

  const handleRotateIsland = () => {
    triggerHaptic('light');
    const nextRot = ((islandState.rotation + 1) % 4) as 0 | 1 | 2 | 3;
    onUpdateIslandState({ ...islandState, rotation: nextRot });
  };

  const handleCycleLighting = () => {
    triggerHaptic('light');
    const order: ('day' | 'sunset' | 'night')[] = ['day', 'sunset', 'night'];
    const next =
      order[(order.indexOf(islandState.lighting) + 1) % order.length];
    onUpdateIslandState({ ...islandState, lighting: next });
  };

  // Sky & ocean colors based on lighting mode (`island_light.dart`)
  const seaPalette =
    islandState.lighting === 'night'
      ? {
          bgTop: '#081226',
          bgBottom: '#0C2342',
          shallow: '#154360',
          foam: '#38BDF8',
          sand: '#D4AC6E',
          grassTop: '#2E6F40',
          grassLeft: '#1E4D2B',
          grassRight: '#245A33',
          cliffLeft: '#64748B',
          cliffRight: '#475569',
        }
      : islandState.lighting === 'sunset'
      ? {
          bgTop: '#451A3E',
          bgBottom: '#1D3557',
          shallow: '#2A6F97',
          foam: '#FDE68A',
          sand: '#F3C68F',
          grassTop: '#52B788',
          grassLeft: '#2D6A4F',
          grassRight: '#40916C',
          cliffLeft: '#A8A29E',
          cliffRight: '#78716C',
        }
      : {
          bgTop: '#0284C7',
          bgBottom: '#0369A1',
          shallow: '#06B6D4',
          foam: '#E0F2FE',
          sand: '#FDE68A',
          grassTop: '#4ADE80',
          grassLeft: '#16A34A',
          grassRight: '#22C55E',
          cliffLeft: '#CBD5E1',
          cliffRight: '#94A3B8',
        };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Row */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateIslandState({
                  ...islandState,
                  name: nameDraft.trim() || 'Mykonos Sanctuary',
                });
                setEditingName(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="px-3 py-1 rounded-xl text-base font-extrabold"
                style={{
                  backgroundColor: surface.card,
                  color: surface.text,
                  border: `1px solid ${surface.accent}`,
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{ backgroundColor: surface.accent }}
                className="px-3 py-1 rounded-xl text-xs font-bold text-white"
              >
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(islandState.name);
                setEditingName(true);
              }}
              className="flex items-center gap-2 text-left group"
            >
              <h1
                className="text-[22px] font-extrabold tracking-tight leading-none truncate"
                style={{ color: surface.text }}
              >
                {islandState.name}
              </h1>
              <Edit3
                className="w-4 h-4 opacity-60 group-hover:opacity-100 shrink-0"
                style={{ color: surface.muted }}
              />
            </button>
          )}
          <p
            className="text-[12px] font-medium mt-1.5"
            style={{ color: surface.muted }}
          >
            {islandState.unlockedIds.length} / {VOXEL_ISLAND_CATALOG.length}{' '}
            voxel landmarks built
          </p>
        </div>

        {/* Coin Balance Pill (`island_coins.dart`) */}
        <button
          type="button"
          onClick={() => setShowLedgerInfo((s) => !s)}
          style={{
            backgroundColor: surface.card,
            border: `1px solid ${surface.outline}`,
          }}
          className="px-3.5 py-2 rounded-full flex items-center gap-2 shrink-0"
          title="View coin ledger breakdown"
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span
            className="text-sm font-extrabold font-mono-tabular"
            style={{ color: surface.text }}
          >
            {availableCoins.toLocaleString()}
          </span>
          <Info className="w-3.5 h-3.5" style={{ color: surface.muted }} />
        </button>
      </div>

      {/* Coin Ledger Breakdown Sheet (when toggled) */}
      {showLedgerInfo && (
        <div
          className="rounded-[24px] p-4 space-y-2.5 text-xs"
          style={{
            backgroundColor: surface.card,
            border: `1px solid ${surface.outline}`,
          }}
        >
          <div className="flex items-center justify-between font-extrabold" style={{ color: surface.text }}>
            <span>Island Ledger (How Coins Work)</span>
            <span className="text-amber-400 font-mono-tabular">
              Total Earned: {ledger.totalEarned.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: surface.high }}>
              <div style={{ color: surface.muted }}>Habit Check-ins (×10)</div>
              <div className="font-extrabold font-mono-tabular text-sm mt-0.5" style={{ color: surface.text }}>
                +{ledger.checks * 10} coins ({ledger.checks})
              </div>
            </div>
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: surface.high }}>
              <div style={{ color: surface.muted }}>Perfect Days (×25)</div>
              <div className="font-extrabold font-mono-tabular text-sm mt-0.5" style={{ color: surface.text }}>
                +{ledger.perfectDays * 25} coins ({ledger.perfectDays}d)
              </div>
            </div>
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: surface.high }}>
              <div style={{ color: surface.muted }}>Focus Minutes (×1)</div>
              <div className="font-extrabold font-mono-tabular text-sm mt-0.5" style={{ color: surface.text }}>
                +{ledger.focusMinutes} coins ({ledger.focusMinutes}m)
              </div>
            </div>
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: surface.high }}>
              <div style={{ color: surface.muted }}>Streak Milestones</div>
              <div className="font-extrabold font-mono-tabular text-sm mt-0.5" style={{ color: surface.text }}>
                +{ledger.milestones} coins
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ISOMETRIC VOXEL ISLAND CANVAS (`lib/features/island/widgets/island_canvas.dart`) */}
      <div
        data-testid="voxel-island-canvas"
        className="relative rounded-[28px] overflow-hidden shadow-lg select-none"
        style={{
          height: 350,
          background: `linear-gradient(180deg, ${seaPalette.bgTop} 0%, ${seaPalette.bgBottom} 100%)`,
          border: `1px solid ${surface.outline}`,
        }}
      >
        {/* Top Floating Controls: Lighting & 90° Rotation */}
        <div className="absolute top-3.5 inset-x-3.5 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCycleLighting}
            aria-label="Switch island lighting"
            className="px-3 py-1.5 rounded-full backdrop-blur-md bg-black/40 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15"
          >
            {islandState.lighting === 'night' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-300" />
                <span>Starlight</span>
              </>
            ) : islandState.lighting === 'sunset' ? (
              <>
                <Sunset className="w-3.5 h-3.5 text-amber-300" />
                <span>Golden Hour</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-yellow-300" />
                <span>Aegean Sun</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRotateIsland}
            aria-label="Rotate island 90 degrees"
            className="px-3 py-1.5 rounded-full backdrop-blur-md bg-black/40 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Turn {islandState.rotation * 90}°</span>
          </button>
        </div>

        {/* Isometric Voxel Base Terrain SVG */}
        <svg
          viewBox="0 0 400 320"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Night Stars */}
          {islandState.lighting === 'night' && (
            <g fill="#F8FAFC" opacity="0.65">
              <circle cx="50" cy="40" r="1.2" />
              <circle cx="120" cy="25" r="1.5" />
              <circle cx="290" cy="30" r="1.2" />
              <circle cx="345" cy="55" r="1.6" />
              <circle cx="210" cy="18" r="1.1" />
            </g>
          )}

          {/* Shallow Turquoise Lagoon Halo */}
          <ellipse
            cx="200"
            cy="205"
            rx="168"
            ry="82"
            fill={seaPalette.shallow}
            opacity="0.45"
          />
          <ellipse
            cx="200"
            cy="202"
            rx="154"
            ry="72"
            fill="none"
            stroke={seaPalette.foam}
            strokeWidth="1.5"
            strokeDasharray="8 6"
            opacity="0.45"
          />

          {/* Isometric Voxel Island Tiers */}
          {/* Tier 0: Sandy Beach & Cove Base */}
          <IsoBox
            cx={200}
            cy={215}
            w={135}
            d={64}
            h={12}
            top={seaPalette.sand}
            left="#D97706"
            right="#B45309"
          />

          {/* Tier 1: Lower Mediterranean Meadow (Vega & Huerta) */}
          <IsoBox
            cx={200}
            cy={200}
            w={118}
            d={55}
            h={16}
            top={seaPalette.grassTop}
            left={seaPalette.cliffLeft}
            right={seaPalette.cliffRight}
          />

          {/* Tier 2: Middle Limestone Terrace (Pueblo & Terrazas) */}
          <IsoBox
            cx={202}
            cy={176}
            w={88}
            d={42}
            h={18}
            top={seaPalette.grassTop}
            left={seaPalette.grassLeft}
            right={seaPalette.grassRight}
          />

          {/* Tier 3: Upper Acropolis / Mirador Ridge */}
          <IsoBox
            cx={206}
            cy={148}
            w={54}
            d={26}
            h={18}
            top={seaPalette.grassTop}
            left={seaPalette.cliffLeft}
            right={seaPalette.cliffRight}
          />
        </svg>

        {/* Interactive Voxel Landmark Nodes */}
        {VOXEL_ISLAND_CATALOG.map((piece) => {
          const owned = islandState.unlockedIds.includes(piece.id);
          const isSelected = selectedPieceId === piece.id;
          // Apply simple rotational coordinate shift when user rotates the island
          const rotOffset =
            islandState.rotation === 1
              ? { dx: (50 - piece.y) * 0.25, dy: (piece.x - 50) * 0.15 }
              : islandState.rotation === 2
              ? { dx: (50 - piece.x) * 0.35, dy: 0 }
              : islandState.rotation === 3
              ? { dx: (piece.y - 50) * 0.25, dy: (50 - piece.x) * 0.15 }
              : { dx: 0, dy: 0 };

          const leftPct = Math.min(86, Math.max(14, piece.x + rotOffset.dx));
          const topPct = Math.min(82, Math.max(16, piece.y + rotOffset.dy));

          return (
            <motion.button
              key={piece.id}
              type="button"
              onClick={() => setSelectedPieceId(piece.id)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isSelected ? 1.14 : 1,
                opacity: 1,
              }}
              whileTap={{ scale: 0.92 }}
              aria-label={`${piece.name} (${owned ? 'Built' : `${piece.price} coins`})`}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center focus:outline-none group"
            >
              <CelebrationBurst
                active={burstPieceId === piece.id}
                color="#FBBF24"
                size="md"
              />
              {owned ? (
                /* Built Isometric 3D Voxel Landmark */
                <div className="relative flex flex-col items-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    className="drop-shadow-md overflow-visible"
                  >
                    <IsoBox
                      cx={24}
                      cy={36}
                      w={14}
                      d={7}
                      h={14}
                      top={piece.colors[0]}
                      left={piece.colors[1]}
                      right={piece.colors[2]}
                    />
                    {/* Roof / Dome / Spire accent voxel */}
                    <IsoBox
                      cx={24}
                      cy={22}
                      w={9}
                      d={5}
                      h={7}
                      top={piece.colors[3]}
                      left={piece.colors[3]}
                      right={piece.colors[2]}
                    />
                  </svg>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold whitespace-nowrap shadow-xs transition-all bg-amber-400 text-slate-950 scale-105">
                      {piece.name}
                    </span>
                  )}
                </div>
              ) : (
                /* Unbuilt Voxel Plot Marker */
                <div
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center border backdrop-blur-xs transition-all ${
                    isSelected
                      ? 'bg-amber-400/90 text-slate-950 border-white scale-110'
                      : 'bg-black/45 text-white/85 border-white/30 hover:bg-black/65'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Landmark Inspector / Purchase Card */}
      <div
        className="rounded-[24px] p-4 flex items-center justify-between gap-3"
        style={{
          backgroundColor: surface.card,
          border: `1px solid ${surface.outline}`,
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider"
              style={{
                backgroundColor: hexWithAlpha(surface.accent, 0.16),
                color: surface.accent,
              }}
            >
              {selectedPiece.region}
            </span>
            <h2
              className="text-sm font-extrabold truncate"
              style={{ color: surface.text }}
            >
              {selectedPiece.name}
            </h2>
          </div>
          <p
            className="text-xs mt-1 leading-snug"
            style={{ color: surface.muted }}
          >
            {selectedPiece.description}
          </p>
        </div>

        {isSelectedOwned ? (
          <div
            className="px-3.5 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shrink-0"
            style={{
              backgroundColor: hexWithAlpha(surface.success, 0.16),
              color: surface.success,
            }}
          >
            <Check className="w-4 h-4 stroke-[2.75]" />
            <span>Placed</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={availableCoins < selectedPiece.price}
            onClick={() => handleBuyPiece(selectedPiece)}
            style={{
              backgroundColor:
                availableCoins >= selectedPiece.price
                  ? surface.accent
                  : surface.high,
              color:
                availableCoins >= selectedPiece.price
                  ? '#FFFFFF'
                  : surface.muted,
            }}
            className="px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span>Build · {selectedPiece.price}</span>
          </button>
        )}
      </div>

      {/* Full Voxel Island Catalog Grid (`lib/features/island/widgets/island_sheets.dart`) */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" style={{ color: surface.accent }} />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Island Voxel Workshop
            </h2>
          </div>
          <span
            className="text-[11px] font-bold flex items-center gap-1"
            style={{ color: surface.muted }}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Complete habits to earn coins
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {VOXEL_ISLAND_CATALOG.map((item) => {
            const owned = islandState.unlockedIds.includes(item.id);
            const active = selectedPieceId === item.id;
            const canAfford = availableCoins >= item.price;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedPieceId(item.id)}
                className="p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2"
                style={{
                  backgroundColor: active
                    ? hexWithAlpha(surface.accent, 0.12)
                    : surface.high,
                  borderColor: active ? surface.accent : 'transparent',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: surface.muted }}
                    >
                      {item.region}
                    </div>
                    <div
                      className="text-xs font-extrabold truncate mt-0.5"
                      style={{ color: surface.text }}
                    >
                      {item.name}
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-lg shrink-0 border border-white/20"
                    style={{ backgroundColor: item.colors[3] }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {owned ? (
                    <span
                      className="text-[11px] font-extrabold inline-flex items-center gap-1"
                      style={{ color: surface.success }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                      Built
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPieceId(item.id);
                        handleBuyPiece(item);
                      }}
                      style={{
                        backgroundColor: canAfford
                          ? surface.accent
                          : surface.card,
                        color: canAfford ? '#FFFFFF' : surface.muted,
                      }}
                      className="w-full py-1.5 rounded-xl text-[11px] font-extrabold inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Coins className="w-3 h-3 text-amber-300" />
                      <span>{item.price} coins</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

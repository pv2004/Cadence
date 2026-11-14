import React, { useMemo, useRef, useEffect } from 'react';
import { AccentColorId } from '../types/habit';
import { ACCENT_PALETTES, getColorLevels } from '../utils/themes';
import { HeatmapCell } from '../utils/habitLogic';
import { getWeekdayShortLabels } from '../utils/dateUtils';

interface HabitHeatmapProps {
  cells: HeatmapCell[];
  accentColor: AccentColorId;
  customColor?: string;
  isDark: boolean;
  weekStartsOn: 0 | 1;
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string | null;
  compact?: boolean;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  cells,
  accentColor,
  customColor,
  isDark,
  weekStartsOn,
  onSelectDate,
  selectedDate,
  compact = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const targetHex = customColor || surface.accent;
  const levels = getColorLevels(targetHex, isDark, surface.high);
  const weekdayLabels = getWeekdayShortLabels(weekStartsOn);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [cells.length]);

  const { columns, monthHeaders } = useMemo(() => {
    if (cells.length === 0) return { columns: [], monthHeaders: [] };

    const firstDate = new Date(cells[0].date + 'T12:00:00');
    const firstDow = firstDate.getDay();
    const offset = (firstDow - weekStartsOn + 7) % 7;

    const paddedCells: (HeatmapCell | null)[] = Array(offset).fill(null).concat(cells);
    const cols: (HeatmapCell | null)[][] = [];

    for (let i = 0; i < paddedCells.length; i += 7) {
      cols.push(paddedCells.slice(i, i + 7));
    }

    const headers: { colIndex: number; label: string }[] = [];
    let lastMonth = -1;

    cols.forEach((col, colIndex) => {
      const firstValid = col.find((c) => c !== null);
      if (firstValid) {
        const d = new Date(firstValid.date + 'T12:00:00');
        const m = d.getMonth();
        if (m !== lastMonth) {
          if (headers.length === 0 || colIndex - headers[headers.length - 1].colIndex >= 3) {
            headers.push({
              colIndex,
              label: d.toLocaleDateString('en-US', { month: 'short' }),
            });
          }
          lastMonth = m;
        }
      }
    });

    return { columns: cols, monthHeaders: headers };
  }, [cells, weekStartsOn]);

  const cellSize = compact ? 10 : 12;
  const gapSize = compact ? 3 : 3.5;

  return (
    <div className="w-full">
      <div className="flex items-start gap-2">
        {!compact && (
          <div
            className="grid shrink-0 pt-5 text-[10px] font-medium select-none pr-1"
            style={{
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              rowGap: `${gapSize}px`,
              color: surface.muted,
            }}
          >
            {weekdayLabels.map((lbl, idx) => (
              <span key={idx} className="leading-none flex items-center">
                {idx % 2 === 1 ? lbl.slice(0, 3) : ''}
              </span>
            ))}
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="overflow-x-auto no-scrollbar pb-1 flex-1"
        >
          <div className="inline-block min-w-max">
            {!compact && (
              <div
                className="relative h-4 mb-1 text-[10px] font-medium select-none"
                style={{ color: surface.muted }}
              >
                {monthHeaders.map((h) => (
                  <span
                    key={h.colIndex}
                    className="absolute top-0"
                    style={{ left: `${h.colIndex * (cellSize + gapSize)}px` }}
                  >
                    {h.label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex" style={{ gap: `${gapSize}px` }}>
              {columns.map((col, colIndex) => (
                <div
                  key={colIndex}
                  className="grid"
                  style={{
                    gridTemplateRows: `repeat(7, ${cellSize}px)`,
                    rowGap: `${gapSize}px`,
                  }}
                >
                  {Array.from({ length: 7 }).map((_, rowIndex) => {
                    const cell = col[rowIndex];
                    if (!cell) {
                      return (
                        <div
                          key={rowIndex}
                          style={{ width: cellSize, height: cellSize }}
                          className="rounded-[3px] opacity-0 pointer-events-none"
                        />
                      );
                    }

                    const isSelected = selectedDate === cell.date;
                    const bg = levels[cell.level];

                    return (
                      <button
                        key={cell.date}
                        type="button"
                        disabled={!onSelectDate}
                        onClick={() => onSelectDate?.(cell.date)}
                        title={`${cell.date}: ${Math.round(cell.ratio * 100)}%`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: bg,
                          outline: isSelected ? `2px solid ${targetHex}` : undefined,
                          outlineOffset: isSelected ? '1px' : undefined,
                        }}
                        className={`rounded-[3.5px] transition-transform ${
                          onSelectDate ? 'hover:scale-125 active:scale-95 cursor-pointer' : 'cursor-default'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <div
          className="flex items-center justify-between mt-3 pt-2 text-[11px]"
          style={{
            borderTop: `1px solid ${surface.outline}`,
            color: surface.muted,
          }}
        >
          <span>Tap any square to inspect or toggle</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            {([0, 1, 2, 3, 4] as const).map((lvl) => (
              <span
                key={lvl}
                className="w-2.5 h-2.5 rounded-[3px] inline-block"
                style={{ backgroundColor: levels[lvl] }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
};

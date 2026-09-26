"use client";

/**
 * src/game/ui/Sheet.tsx — شیتِ پنل‌ها (الگوی موبایل: کشیدن به پایین = بستن)
 */

import { useRef } from "react";
import { BMAP } from "../data";
import { idx, type State } from "../logic";
import { Icon } from "../icons";
import { haptic } from "../mobile";
import { capturePointer } from "../useCanvasInput";
import { PANEL_META, type Panel, type UiApi } from "./common";
import { MarketPanel, OrdersPanel } from "./panels/Trade";
import { BuildPanel, DecorPanel } from "./panels/Build";
import { SkillsPanel, TechPanel } from "./panels/Progress";
import { BizPanel } from "./panels/Biz";
import { ContractsPanel, AchievementsPanel } from "./panels/Goals";
import { StoryPanel } from "./panels/StoryJournal";
import { SettingsPanel, type SettingsProps } from "./panels/Settings";
import { HelpPanel } from "./panels/Help";
import { WorkshopPanel } from "./panels/Workshop";

interface SheetProps {
  s: State;
  panel: Exclude<Panel, null>;
  ui: UiApi;
  settings: Omit<SettingsProps, "s" | "ui">;
}

export default function Sheet({ s, panel, ui, settings }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ y: 0, dy: 0, active: false });

  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0, active: true };
    capturePointer(e.currentTarget, e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    d.dy = Math.max(0, e.clientY - d.y);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (sheetRef.current) sheetRef.current.style.transform = "";
    if (d.dy > 90) {
      haptic("tap");
      ui.setPanel(null);
    }
  };

  const bp = typeof panel === "object" ? panel : null;
  const bt = bp ? s.tiles[idx(bp.bx, bp.by)] : null;
  const meta = typeof panel === "string" ? PANEL_META[panel] : null;
  const p = { s, ui };

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label={meta?.title ?? (bt?.b ? BMAP[bt.b]?.name : "ساختمان")}
      className="landscape-compact absolute inset-x-0 bottom-0 top-[10%] z-40 mx-auto flex flex-col overflow-hidden rounded-t-3xl bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 shadow-[0_-10px_40px_rgba(0,0,0,0.35)] sm:bottom-[max(12px,env(safe-area-inset-bottom))] sm:max-w-[620px] sm:rounded-3xl sm:ring-2 sm:ring-amber-800/40"
    >
      {/* منطقه‌ی کشیدن: کشیدن به پایین پنل را می‌بندد */}
      <div className="shrink-0 touch-none select-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="mx-auto mt-1.5 mb-1 h-1.5 w-14 rounded-full bg-amber-900/30" />
      </div>
      <div className="flex items-center justify-between bg-gradient-to-l from-amber-700 to-orange-600 px-3 py-2.5 text-white shadow md:px-4 md:py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-black min-[430px]:text-lg min-[768px]:text-xl">
          {meta && (
            <>
              <Icon name={meta.icon} size={28} />
              <span className="truncate">{meta.title}</span>
            </>
          )}
          {bt && bt.b && (
            <>
              <Icon name="home" size={26} />
              <span className="truncate">{BMAP[bt.b]?.name || "ساختمان"}</span>
            </>
          )}
        </h2>
        <button type="button" onClick={() => ui.setPanel(null)} aria-label="بستن" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition active:scale-90">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 md:space-y-3 md:p-3.5">
        {panel === "market" && <MarketPanel {...p} />}
        {panel === "orders" && <OrdersPanel {...p} />}
        {panel === "build" && <BuildPanel {...p} />}
        {panel === "decor" && <DecorPanel {...p} />}
        {panel === "skills" && <SkillsPanel {...p} />}
        {panel === "tech" && <TechPanel {...p} />}
        {panel === "biz" && <BizPanel {...p} />}
        {panel === "contracts" && <ContractsPanel {...p} />}
        {panel === "achievements" && <AchievementsPanel {...p} />}
        {panel === "story" && <StoryPanel {...p} />}
        {panel === "settings" && <SettingsPanel {...p} {...settings} />}
        {panel === "help" && <HelpPanel />}
        {bp && bt && bt.b && <WorkshopPanel {...p} tile={bt} x={bp.bx} y={bp.by} />}
      </div>
    </div>
  );
}

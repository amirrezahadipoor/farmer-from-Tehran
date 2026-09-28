/**
 * src/game/sim/market.ts — اشباعِ بازار و تاریخچه‌ی قیمت‌ها + تمدید و پرکردنِ سفارش‌ها
 * (شکسته‌شده از tick.ts — رفتار و ترتیب کاملاً بدون تغییر)
 */
import { type State } from "./state";
import { genOrder, price } from "./economy";

/** اشباعِ کالاها کم می‌شود و تاریخچه‌ی قیمت هر ۷ ثانیه یک نمونه ثبت می‌کند */
export function updateMarket(s: State, dt: number): void {
  Object.values(s.market).forEach((m) => (m.sat = Math.max(0, m.sat - dt * 0.0035)));
  s.histAcc += dt;
  if (s.histAcc > 7) {
    s.histAcc = 0;
    Object.keys(s.market).forEach((k) => { const h = s.market[k].hist; h.push(price(s, k)); if (h.length > 40) h.shift(); });
  }
}

/** سفارش‌های منقضی تازه می‌شوند و فهرست تا سقفِ سطح پر می‌شود */
export function updateOrders(s: State): void {
  s.orders = s.orders.map((o) => (o.exp < s.time ? genOrder(s) : o));
  const maxOrders = Math.min(7, 3 + Math.floor(s.level / 3));
  while (s.orders.length < maxOrders) s.orders.push(genOrder(s));
}

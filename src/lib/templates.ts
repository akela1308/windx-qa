// Шаблоны по нишам: готовое описание бизнеса, которое подставляется в поле создания.
// Порядок совпадает с t.home.trades (названия ниш переведены там).
// Описания на английском, потому что сайты клиентов на английском.
export const TEMPLATE_BRIEFS = [
  "Bike repair workshop in a Hackney railway arch, same day fixes for couriers, wheel building and steel frame restoration.",
  "Family law practice in Islington, two partners, fixed fees and a free 20 minute first call.",
  "Small yoga studio above a bakery in Peckham, 14 mats, slow flow, yin and a beginners course.",
  "Neighbourhood sourdough bakery in Walthamstow, baking from 5am, weekend pastries and whole cakes to order.",
  "Two chair barbershop in Deptford, skin fades, beard trims and hot towel shaves, walk-ins and bookings.",
  "Independent florist in Stoke Newington, seasonal British flowers, weekly bouquets and small weddings.",
  "Gas Safe plumber covering south east London, boiler repairs and servicing, leaks and same day callouts.",
  "Family dental practice in Ealing, NHS and private check-ups, hygienist, Invisalign and emergency slots.",
  "Corner café in Brixton, speciality coffee, brunch until 3pm and toasties, dogs and laptops welcome.",
  "Maths and science tutor in Richmond, GCSE and A level, one to one lessons at home or online.",
  "NICEIC electrician in Croydon, rewires, consumer units, EV chargers and landlord safety certificates.",
  "Private tattoo studio in Shoreditch, fine line and blackwork, custom designs by appointment only.",
] as const;

export function templateBrief(i: unknown): string | undefined {
  const n = Number(i);
  return Number.isInteger(n) ? TEMPLATE_BRIEFS[n] : undefined;
}

// Explicit catalogue choices only; automatic generation never branches on the trade.
export const TEMPLATE_STYLES = ['swiss','newsprint','monotone','soft-clay','deep-ink','soft-clay','clear-product','clear-product','poster-duo','warm-editorial','signal','night-shift'] as const;
export function templateIndex(value: unknown): number | undefined {
  if(typeof value!=='string'||!/^\d{1,2}$/.test(value))return undefined;
  const n=Number(value);return n<TEMPLATE_BRIEFS.length?n:undefined;
}

// Catalogue display order only; keep the stable trade IDs used by URLs.
export const TEMPLATE_CATALOG_ORDER = [6,5,4,8,0,11,2,3,1,9,10,7] as const;

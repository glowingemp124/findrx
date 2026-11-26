import { Icon as Iconify } from "@iconify/react";
import bell from "@iconify-icons/lucide/bell";
import check from "@iconify-icons/lucide/check";
import chevronDown from "@iconify-icons/lucide/chevron-down";
import clock from "@iconify-icons/lucide/clock";
import menu from "@iconify-icons/lucide/menu";
import phone from "@iconify-icons/lucide/phone";
import plus from "@iconify-icons/lucide/plus";
import settings from "@iconify-icons/lucide/settings";
import sun from "@iconify-icons/lucide/sun";
import x from "@iconify-icons/lucide/x";
import send from "@iconify-icons/lucide/send";
import lock from "@iconify-icons/lucide/lock";
import shieldCheck from "@iconify-icons/lucide/shield-check";
import mapPin from "@iconify-icons/lucide/map-pin";
import truck from "@iconify-icons/lucide/truck";
import arrowRight from "@iconify-icons/lucide/arrow-right";
import sparkles from "@iconify-icons/lucide/sparkles";
import circleCheck from "@iconify-icons/lucide/circle-check";
import info from "@iconify-icons/lucide/info";
import navigation from "@iconify-icons/lucide/navigation";
import alert from "@iconify-icons/lucide/triangle-alert";
import inbox from "@iconify-icons/lucide/inbox";
import clipboardCheck from "@iconify-icons/lucide/clipboard-check";
import history from "@iconify-icons/lucide/history";
import logOut from "@iconify-icons/lucide/log-out";
import pause from "@iconify-icons/lucide/circle-pause";
import arrowLeft from "@iconify-icons/lucide/arrow-left";
import copy from "@iconify-icons/lucide/copy";
import user from "@iconify-icons/lucide/user-round";
import keyRoundIcon from "@iconify-icons/lucide/key-round";
import dashboardIcon from "@iconify-icons/lucide/layout-dashboard";
import buildingIcon from "@iconify-icons/lucide/building-2";
import receiptIcon from "@iconify-icons/lucide/receipt";
import shieldIcon from "@iconify-icons/lucide/shield-user";
import searchIcon from "@iconify-icons/lucide/search";
import chevronLeftIcon from "@iconify-icons/lucide/chevron-left";
import chevronRightIcon from "@iconify-icons/lucide/chevron-right";
import sortIcon from "@iconify-icons/lucide/arrow-up-down";
import sortUpIcon from "@iconify-icons/lucide/arrow-up";
import sortDownIcon from "@iconify-icons/lucide/arrow-down";
import downloadIcon from "@iconify-icons/lucide/download";
import refreshIcon from "@iconify-icons/lucide/refresh-cw";
import banIcon from "@iconify-icons/lucide/ban";
import pencilIcon from "@iconify-icons/lucide/pencil";
import trashIcon from "@iconify-icons/lucide/trash-2";
import mailIcon from "@iconify-icons/lucide/mail";
import filterIcon from "@iconify-icons/lucide/sliders-horizontal";
import trendingUpIcon from "@iconify-icons/lucide/trending-up";
import trendingDownIcon from "@iconify-icons/lucide/trending-down";
import xCircleIcon from "@iconify-icons/lucide/circle-x";
import eyeIcon from "@iconify-icons/lucide/eye";
import circleAlertIcon from "@iconify-icons/lucide/circle-alert";
import panelIcon from "@iconify-icons/lucide/panel-left";
import cameraIcon from "@iconify-icons/lucide/camera";
import uploadIcon from "@iconify-icons/lucide/upload";
import { cn } from "@/lib/cn";

/** Solid crescent for the dark-mode toggle (famicons:moon-sharp, MIT). Lucide's moon is outline only. */
const moon = {
  width: 512,
  height: 512,
  body: '<path fill="currentColor" d="M152.62 126.77c0-33 4.85-66.35 17.23-94.77C87.54 67.83 32 151.89 32 247.38C32 375.85 136.15 480 264.62 480c95.49 0 179.55-55.54 215.38-137.85c-28.42 12.38-61.8 17.23-94.77 17.23c-128.47 0-232.61-104.14-232.61-232.61"/>',
};

export type IconName =
  | "upload"
  | "camera"
  | "panel"
  | "circleAlert"
  | "eye"
  | "xCircle"
  | "trendingDown"
  | "trendingUp"
  | "filter"
  | "mail"
  | "trash"
  | "pencil"
  | "ban"
  | "refresh"
  | "download"
  | "sortDown"
  | "sortUp"
  | "sort"
  | "chevronRight"
  | "chevronLeft"
  | "search"
  | "shield"
  | "receipt"
  | "building"
  | "dashboard"
  | "keyRound"
  | "user"
  | "copy"
  | "clock"
  | "bell"
  | "plus"
  | "sun"
  | "moon"
  | "check"
  | "close"
  | "chevron"
  | "menu"
  | "phone"
  | "settings"
  | "send"
  | "lock"
  | "shieldCheck"
  | "mapPin"
  | "truck"
  | "arrowRight"
  | "sparkles"
  | "circleCheck"
  | "info"
  | "navigation"
  | "alert"
  | "inbox"
  | "clipboardCheck"
  | "history"
  | "logOut"
  | "pause"
  | "arrowLeft";

const icons = {
  upload: uploadIcon,
  camera: cameraIcon,
  panel: panelIcon,
  circleAlert: circleAlertIcon,
  eye: eyeIcon,
  xCircle: xCircleIcon,
  trendingDown: trendingDownIcon,
  trendingUp: trendingUpIcon,
  filter: filterIcon,
  mail: mailIcon,
  trash: trashIcon,
  pencil: pencilIcon,
  ban: banIcon,
  refresh: refreshIcon,
  download: downloadIcon,
  sortDown: sortDownIcon,
  sortUp: sortUpIcon,
  sort: sortIcon,
  chevronRight: chevronRightIcon,
  chevronLeft: chevronLeftIcon,
  search: searchIcon,
  shield: shieldIcon,
  receipt: receiptIcon,
  building: buildingIcon,
  dashboard: dashboardIcon,
  keyRound: keyRoundIcon,
  user,
  copy,
  clock,
  bell,
  plus,
  sun,
  moon,
  check,
  close: x,
  chevron: chevronDown,
  menu,
  phone,
  settings,
  send,
  lock,
  shieldCheck,
  mapPin,
  truck,
  arrowRight,
  sparkles,
  circleCheck,
  info,
  navigation,
  alert,
  inbox,
  clipboardCheck,
  history,
  logOut,
  pause,
  arrowLeft,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <Iconify icon={icons[name]} className={cn("size-[18px] shrink-0", className)} />;
}

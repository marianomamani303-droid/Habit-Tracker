const paths = {
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  medal:
    "m8 3 4 6 4-6M5 3h4l3 5 3-5h4M12 8a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-3 8 2 2 4-4",
  flame:
    "M13 2c2 7 7 7 6 13a7 7 0 0 1-14 0c-1-4 2-6 4-9 0 4 1 5 2 6 3-3 2-7 2-10Z",
  flower:
    "M12 9C3 0 2 12 9 12c-9 7 5 14 3 3 6 9 15-2 3-3 10-6 0-14-3-3ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  tree: "m12 2 6 7h-3l6 7H3l6-7H6l6-7ZM12 16v6M8 22h8",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  habits: "M9 5h12M9 12h12M9 19h12M3 5l1 1 2-2M3 12l1 1 2-2M3 19l1 1 2-2",
  stats: "M4 20V10m8 10V4m8 16v-7",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  logout: "M9 4H4v16h5m5-13 5 5-5 5m-6-5h11",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  leaf: "M20 4C8 2 2 8 5 15s15 4 15-11ZM5 20l9-10",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
};

export default function DashboardIcon({ name, ...props }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.leaf} />
    </svg>
  );
}

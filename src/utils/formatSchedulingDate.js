export function formatSchedulingDate(dateStr) {
  if (!dateStr) {
    return "";
  }

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return String(dateStr);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

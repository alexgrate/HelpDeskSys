export function getSlaMetrics(createdAt, priority, status, resolvedAt, ticketSlaHours = null) {
  const createdDate = new Date(createdAt);
  const isResolved = status === "Resolved" || status === "Closed";
  const endDate = isResolved && resolvedAt ? new Date(resolvedAt) : new Date();
  const elapsedMin = Math.floor((endDate - createdDate) / (1000 * 60));
  
  let totalMin = 240; 

  if (ticketSlaHours && ticketSlaHours[priority]) {
    totalMin = ticketSlaHours[priority] * 60;
  } else {
    if (priority === "Critical") totalMin = 60;
    else if (priority === "High") totalMin = 120;
    else if (priority === "Low") totalMin = 480;
  }
  
  const remainingMin = totalMin - elapsedMin;
  return { totalMin, remainingMin };
}
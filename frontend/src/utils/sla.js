export function getSlaMetrics(createdAt, priority, status, updatedAt) {
  const createdDate = new Date(createdAt);
  const isResolved = status === "Resolved" || status === "Closed"

  const endDate = isResolved && updatedAt ? new Date(updatedAt) : new Date()
  
  // Difference in minutes
  const elapsedMin = Math.floor((endDate - createdDate) / (1000 * 60));

  let totalMin = 240; 
  if (priority === "Critical") totalMin = 60;
  else if (priority === "High") totalMin = 120;
  else if (priority === "Low") totalMin = 480;

  const remainingMin = totalMin - elapsedMin;
  return { totalMin, remainingMin };
}
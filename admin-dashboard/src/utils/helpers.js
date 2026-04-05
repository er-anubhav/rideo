export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};

export const getStatusColor = (status) => {
  const colors = {
    completed: 'status-pill status-pill-strong',
    active: 'status-pill',
    pending: 'status-pill status-pill-soft',
    cancelled: 'status-pill status-pill-muted',
    open: 'status-pill',
    in_progress: 'status-pill status-pill-soft',
    resolved: 'status-pill status-pill-strong',
    closed: 'status-pill status-pill-muted',
  };
  return colors[status] || 'status-pill status-pill-muted';
};

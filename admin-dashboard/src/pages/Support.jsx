import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate, getStatusColor } from '../utils/helpers';

const priorityTone = {
  urgent: 'status-pill status-pill-strong',
  high: 'status-pill',
  medium: 'status-pill status-pill-soft',
  low: 'status-pill status-pill-muted',
};

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadTickets();
  }, [page, statusFilter, priorityFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status_filter = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await adminService.getTickets(params);
      setTickets(response.data.tickets);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId) => {
    try {
      const response = await adminService.getTicketDetails(ticketId);
      setSelectedTicket(response.data.ticket);
    } catch (error) {
      console.error('Failed to load ticket details:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    try {
      await adminService.replyToTicket(selectedTicket.id, replyText);
      setReplyText('');
      loadTicketDetails(selectedTicket.id);
      loadTickets();
    } catch (error) {
      alert('Failed to send reply');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await adminService.updateTicketStatus(ticketId, newStatus);
      if (selectedTicket && selectedTicket.id === ticketId) {
        loadTicketDetails(ticketId);
      }
      loadTickets();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Support Desk</span>
          <h1 className="page-title">
            Ticket <span className="display-accent">workflow</span>
          </h1>
          <p className="page-subtitle">Work through the inbox, change states fast, and keep replies in one focused resolution panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="filter-shell">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-control">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="form-control">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="surface-card empty-state">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="surface-card empty-state">No tickets found</div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => loadTicketDetails(ticket.id)}
                  className={`ticket-card ${selectedTicket?.id === ticket.id ? 'ticket-card-active' : ''}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-extrabold tracking-tight text-black">{ticket.subject}</h3>
                      <p className="table-note mt-2">
                        {ticket.user?.name} • {ticket.user?.phone}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</span>
                        <span className={priorityTone[ticket.priority] || 'status-pill status-pill-muted'}>{ticket.priority}</span>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="table-note">{formatDate(ticket.createdAt)}</p>
                      <p className="table-note mt-1">{ticket.messageCount} messages</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {total > 20 && (
            <div className="pagination-shell">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="button-secondary">
                Previous
              </button>
              <span className="table-note">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="button-secondary"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div>
          {selectedTicket ? (
            <div className="surface-card-strong lg:sticky lg:top-6">
              <h2 className="text-2xl font-extrabold tracking-tight">Ticket details</h2>

              <div className="mt-5 border-b border-black/10 pb-5">
                <h3 className="text-lg font-bold text-black">{selectedTicket.ticket.subject}</h3>
                <p className="table-note mt-1">{selectedTicket.ticket.user?.name}</p>
              </div>

              <div className="mt-5 input-shell">
                <label className="field-label">Status</label>
                <select
                  value={selectedTicket.ticket.status}
                  onChange={(e) => handleStatusChange(selectedTicket.ticket.id, e.target.value)}
                  className="form-control"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="mt-6">
                <h3 className="field-label">Messages</h3>
                <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-bubble ${msg.isAdminMessage ? 'message-bubble-admin ml-4' : 'mr-4'}`}
                    >
                      <p className="text-sm leading-6">{msg.messageText}</p>
                      <p className="table-note mt-2">
                        {msg.isAdminMessage ? 'Admin' : 'User'} • {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTicket.ticket.status !== 'closed' && (
                <div className="mt-6">
                  <label className="field-label">Reply</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="form-control mt-2 min-h-28"
                    rows="3"
                    placeholder="Type your reply..."
                  />
                  <button onClick={handleReply} disabled={!replyText.trim()} className="button-primary mt-3 w-full">
                    <Send className="h-4 w-4" />
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="surface-card empty-state">Select a ticket to view details</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support;

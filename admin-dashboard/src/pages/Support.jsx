import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate, getStatusColor } from '../utils/helpers';

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tickets List */}
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Support Tickets</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No tickets found
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => loadTicketDetails(ticket.id)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {ticket.user?.name} • {ticket.user?.phone}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                    <p className="text-xs text-gray-500 mt-1">{ticket.messageCount} messages</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {page} of {Math.ceil(total / 20)}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Ticket Details */}
      <div className="lg:col-span-1">
        {selectedTicket ? (
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Ticket Details</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900">{selectedTicket.ticket.subject}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedTicket.ticket.user?.name}
              </p>
            </div>

            {/* Status Change */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedTicket.ticket.status}
                onChange={(e) => handleStatusChange(selectedTicket.ticket.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Messages */}
            <div className="mb-4 max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-2">Messages</h3>
              <div className="space-y-3">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.isAdminMessage ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                    }`}
                  >
                    <p className="text-sm text-gray-800">{msg.messageText}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {msg.isAdminMessage ? 'Admin' : 'User'} • {formatDate(msg.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Form */}
            {selectedTicket.ticket.status !== 'closed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Type your reply..."
                ></textarea>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Reply
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-500 text-center">Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;

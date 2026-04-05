import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate, formatCurrency } from '../utils/helpers';

const Wallet = () => {
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallets');
  const [transactionType, setTransactionType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (activeTab === 'wallets') {
      loadWallets();
    } else {
      loadTransactions();
    }
  }, [activeTab, page, transactionType]);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      const response = await adminService.getWallets(params);
      setWallets(response.data.wallets);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (transactionType) params.transaction_type = transactionType;

      const response = await adminService.getTransactions(params);
      setTransactions(response.data.transactions);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Finance</span>
          <h1 className="page-title">
            Wallet <span className="display-accent">management</span>
          </h1>
          <p className="page-subtitle">Switch cleanly between stored balances and transaction history without changing the visual rhythm.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="metric-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Total Wallets</p>
              <h3 className="metric-value">{total}</h3>
            </div>
            <div className="metric-icon">
              <WalletIcon className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="metric-card metric-card-dark">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Total Balance</p>
              <h3 className="metric-value">{formatCurrency(totalBalance)}</h3>
            </div>
            <div className="metric-icon">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Transactions</p>
              <h3 className="metric-value">{activeTab === 'transactions' ? total : '-'}</h3>
            </div>
            <div className="metric-icon">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="tab-shell">
        <div className="tab-header">
          <button
            onClick={() => {
              setActiveTab('wallets');
              setPage(1);
            }}
            className={`tab-button ${activeTab === 'wallets' ? 'tab-button-active' : ''}`}
          >
            User Wallets
          </button>
          <button
            onClick={() => {
              setActiveTab('transactions');
              setPage(1);
            }}
            className={`tab-button ${activeTab === 'transactions' ? 'tab-button-active' : ''}`}
          >
            All Transactions
          </button>
        </div>

        {activeTab === 'wallets' && (
          <div className="overflow-x-auto p-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Loading wallets...
                    </td>
                  </tr>
                ) : wallets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No wallets found
                    </td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr key={wallet.id}>
                      <td className="font-semibold text-black">{wallet.user?.name}</td>
                      <td className="muted-number">{wallet.user?.phone}</td>
                      <td className="font-semibold">{formatCurrency(wallet.balance)}</td>
                      <td>
                        <span className={wallet.isActive === 'active' ? 'status-pill status-pill-strong' : 'status-pill status-pill-muted'}>
                          {wallet.isActive}
                        </span>
                      </td>
                      <td className="table-note">{formatDate(wallet.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <div className="border-b border-black/10 p-4">
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="form-control max-w-xs">
                <option value="">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="refund">Refund</option>
                <option value="ride_payment">Ride Payment</option>
              </select>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Description</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="font-mono text-sm">{txn.id.substring(0, 8)}...</td>
                        <td>
                          <span className={txn.transactionType === 'credit' ? 'status-pill status-pill-strong' : 'status-pill'}>
                            {txn.transactionType}
                          </span>
                        </td>
                        <td className="font-semibold">
                          {txn.transactionType === 'credit' || txn.transactionType === 'refund' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </td>
                        <td>{formatCurrency(txn.balanceAfter)}</td>
                        <td className="table-note">{txn.description}</td>
                        <td className="table-note">{formatDate(txn.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {total > (activeTab === 'wallets' ? 20 : 50) && (
        <div className="pagination-shell">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="button-secondary">
            Previous
          </button>
          <span className="table-note">
            Page {page} of {Math.ceil(total / (activeTab === 'wallets' ? 20 : 50))}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / (activeTab === 'wallets' ? 20 : 50))}
            className="button-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Wallet;

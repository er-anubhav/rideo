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

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Wallet Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Wallets</p>
              <h3 className="text-2xl font-bold mt-1">{total}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <WalletIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalBalance)}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <h3 className="text-2xl font-bold mt-1">{activeTab === 'transactions' ? total : '-'}</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingDown className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => { setActiveTab('wallets'); setPage(1); }}
              className={`px-6 py-3 font-medium ${
                activeTab === 'wallets'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              User Wallets
            </button>
            <button
              onClick={() => { setActiveTab('transactions'); setPage(1); }}
              className={`px-6 py-3 font-medium ${
                activeTab === 'transactions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Transactions
            </button>
          </div>
        </div>

        {/* Wallets Tab */}
        {activeTab === 'wallets' && (
          <div className="p-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      Loading wallets...
                    </td>
                  </tr>
                ) : wallets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No wallets found
                    </td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{wallet.user?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{wallet.user?.phone}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(wallet.balance)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          wallet.isActive === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {wallet.isActive}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(wallet.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="p-4 border-b">
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="refund">Refund</option>
                <option value="ride_payment">Ride Payment</option>
              </select>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {txn.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            txn.transactionType === 'credit' ? 'bg-green-100 text-green-800' :
                            txn.transactionType === 'debit' ? 'bg-red-100 text-red-800' :
                            txn.transactionType === 'refund' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {txn.transactionType}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold ${
                          txn.transactionType === 'credit' || txn.transactionType === 'refund'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {txn.transactionType === 'credit' || txn.transactionType === 'refund' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(txn.balanceAfter)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {txn.description}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(txn.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > (activeTab === 'wallets' ? 20 : 50) && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {Math.ceil(total / (activeTab === 'wallets' ? 20 : 50))}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / (activeTab === 'wallets' ? 20 : 50))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Wallet;

import { useEffect, useState } from 'react';
import { Plus, Ticket } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate, formatCurrency } from '../utils/helpers';

const Promo = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    maxDiscount: '',
    minRideAmount: '',
    maxUses: '',
    maxUsesPerUser: '1',
    validUntil: '',
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPromoCodes();
      setPromoCodes(response.data.promoCodes);
    } catch (error) {
      console.error('Failed to load promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();

    try {
      await adminService.createPromoCode(formData);
      setShowCreateForm(false);
      setFormData({
        code: '',
        discountType: 'percent',
        discountValue: '',
        maxDiscount: '',
        minRideAmount: '',
        maxUses: '',
        maxUsesPerUser: '1',
        validUntil: '',
      });
      loadPromoCodes();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create promo code');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Growth</span>
          <h1 className="page-title">
            Promo <span className="display-accent">codes</span>
          </h1>
          <p className="page-subtitle">Campaign creation now shares the same layout rhythm, form system, and table treatment as the rest of the dashboard.</p>
        </div>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="button-primary">
          <Plus className="h-5 w-5" />
          {showCreateForm ? 'Hide Form' : 'Create Promo Code'}
        </button>
      </div>

      {showCreateForm && (
        <div className="surface-card-strong">
          <div className="page-heading mb-6">
            <div>
              <span className="page-kicker">New Campaign</span>
              <h2 className="text-2xl font-extrabold tracking-tight">Create promo code</h2>
            </div>
          </div>
          <form onSubmit={handleCreatePromo} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="input-shell">
                <label className="field-label">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="form-control"
                  placeholder="SUMMER50"
                  required
                />
              </div>
              <div className="input-shell">
                <label className="field-label">Discount Type *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="form-control"
                  required
                >
                  <option value="percent">Percentage</option>
                  <option value="flat">Flat Amount</option>
                </select>
              </div>
              <div className="input-shell">
                <label className="field-label">Discount Value *</label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="form-control"
                  placeholder={formData.discountType === 'percent' ? '50' : '100'}
                  required
                  min="0"
                />
              </div>
              <div className="input-shell">
                <label className="field-label">Max Discount</label>
                <input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className="form-control"
                  placeholder="100"
                  min="0"
                />
              </div>
              <div className="input-shell">
                <label className="field-label">Minimum Ride Amount</label>
                <input
                  type="number"
                  value={formData.minRideAmount}
                  onChange={(e) => setFormData({ ...formData, minRideAmount: e.target.value })}
                  className="form-control"
                  placeholder="200"
                  min="0"
                />
              </div>
              <div className="input-shell">
                <label className="field-label">Max Total Uses</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="form-control"
                  placeholder="1000"
                  min="0"
                />
              </div>
              <div className="input-shell">
                <label className="field-label">Max Uses Per User *</label>
                <input
                  type="number"
                  value={formData.maxUsesPerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                  className="form-control"
                  placeholder="1"
                  required
                  min="1"
                />
              </div>
              <div className="input-shell">
                <label className="field-label">Valid Until</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="form-control"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="button-primary">
                Create Promo Code
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="button-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Usage</th>
                <th>Valid Until</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Loading promo codes...
                  </td>
                </tr>
              ) : promoCodes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No promo codes found. Create one to get started.
                  </td>
                </tr>
              ) : (
                promoCodes.map((promo) => (
                  <tr key={promo.id}>
                    <td>
                      <div className="flex items-center gap-2 font-semibold text-black">
                        <Ticket className="h-4 w-4" />
                        <span>{promo.code}</span>
                      </div>
                    </td>
                    <td>
                      {promo.discount_type === 'percent' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)}
                      {promo.max_discount && <div className="table-note mt-1">max {formatCurrency(promo.max_discount)}</div>}
                    </td>
                    <td>
                      {promo.current_uses || 0} / {promo.max_uses || '∞'}
                      <div className="table-note mt-1">{promo.max_uses_per_user} per user</div>
                    </td>
                    <td>{promo.valid_until ? formatDate(promo.valid_until) : 'No expiry'}</td>
                    <td>
                      <span className={promo.is_active ? 'status-pill status-pill-strong' : 'status-pill status-pill-muted'}>
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Promo;

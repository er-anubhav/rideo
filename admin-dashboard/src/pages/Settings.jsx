import { useEffect, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { adminService } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const Settings = () => {
  const [fareConfigs, setFareConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState('');
  const [editedConfig, setEditedConfig] = useState(null);

  useEffect(() => {
    loadFareConfigs();
  }, []);

  const loadFareConfigs = async () => {
    setLoading(true);
    try {
      const response = await adminService.getFareConfigs();
      setFareConfigs(response.data.fareConfigs);
      if (response.data.fareConfigs.length > 0 && !activeVehicle) {
        setActiveVehicle(response.data.fareConfigs[0].vehicle_type);
        setEditedConfig(response.data.fareConfigs[0]);
      }
    } catch (error) {
      console.error('Failed to load fare configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (vehicleType) => {
    const config = fareConfigs.find((item) => item.vehicle_type === vehicleType);
    setActiveVehicle(vehicleType);
    setEditedConfig(config);
  };

  const handleSave = async () => {
    if (!editedConfig) return;

    setSaving(true);
    try {
      await adminService.updateFareConfig(editedConfig.vehicle_type, {
        base_fare: editedConfig.base_fare,
        per_km_rate: editedConfig.per_km_rate,
        per_minute_rate: editedConfig.per_minute_rate,
        minimum_fare: editedConfig.minimum_fare,
        cancellation_fee: editedConfig.cancellation_fee,
      });
      alert('Fare configuration updated successfully!');
      loadFareConfigs();
    } catch (error) {
      alert('Failed to update fare configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const original = fareConfigs.find((item) => item.vehicle_type === activeVehicle);
    setEditedConfig(original);
  };

  const calculateSampleFare = () => {
    if (!editedConfig) return 0;

    const distance = 10;
    const time = 20;

    const fare =
      editedConfig.base_fare +
      distance * editedConfig.per_km_rate +
      time * editedConfig.per_minute_rate;

    return Math.max(fare, editedConfig.minimum_fare);
  };

  if (loading) {
    return <div className="surface-card empty-state">Loading settings...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Configuration</span>
          <h1 className="page-title">
            Fare <span className="display-accent">settings</span>
          </h1>
          <p className="page-subtitle">Pricing controls now read like a production admin tool, with clear tabs, tighter forms, and a strong preview panel.</p>
        </div>
      </div>

      <div className="tab-shell">
        <div className="tab-header">
          {fareConfigs.map((config) => (
            <button
              key={config.vehicle_type}
              onClick={() => handleVehicleChange(config.vehicle_type)}
              className={`tab-button ${activeVehicle === config.vehicle_type ? 'tab-button-active' : ''}`}
            >
              {config.vehicle_type.charAt(0).toUpperCase() + config.vehicle_type.slice(1)}
            </button>
          ))}
        </div>

        {editedConfig && (
          <div className="grid grid-cols-1 gap-8 p-6 xl:grid-cols-2">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Pricing parameters</h2>
              <div className="mt-6 space-y-4">
                <div className="input-shell">
                  <label className="field-label">Base Fare (INR)</label>
                  <input
                    type="number"
                    value={editedConfig.base_fare}
                    onChange={(e) => setEditedConfig({ ...editedConfig, base_fare: parseFloat(e.target.value) })}
                    className="form-control"
                    min="0"
                    step="0.01"
                  />
                  <p className="field-help">Initial charge when the ride begins.</p>
                </div>

                <div className="input-shell">
                  <label className="field-label">Per Kilometer Rate</label>
                  <input
                    type="number"
                    value={editedConfig.per_km_rate}
                    onChange={(e) => setEditedConfig({ ...editedConfig, per_km_rate: parseFloat(e.target.value) })}
                    className="form-control"
                    min="0"
                    step="0.01"
                  />
                  <p className="field-help">Distance charge applied during the trip.</p>
                </div>

                <div className="input-shell">
                  <label className="field-label">Per Minute Rate</label>
                  <input
                    type="number"
                    value={editedConfig.per_minute_rate}
                    onChange={(e) => setEditedConfig({ ...editedConfig, per_minute_rate: parseFloat(e.target.value) })}
                    className="form-control"
                    min="0"
                    step="0.01"
                  />
                  <p className="field-help">Time-based component for slower journeys.</p>
                </div>

                <div className="input-shell">
                  <label className="field-label">Minimum Fare</label>
                  <input
                    type="number"
                    value={editedConfig.minimum_fare}
                    onChange={(e) => setEditedConfig({ ...editedConfig, minimum_fare: parseFloat(e.target.value) })}
                    className="form-control"
                    min="0"
                    step="0.01"
                  />
                  <p className="field-help">Protects the unit economics of short rides.</p>
                </div>

                <div className="input-shell">
                  <label className="field-label">Cancellation Fee</label>
                  <input
                    type="number"
                    value={editedConfig.cancellation_fee}
                    onChange={(e) => setEditedConfig({ ...editedConfig, cancellation_fee: parseFloat(e.target.value) })}
                    className="form-control"
                    min="0"
                    step="0.01"
                  />
                  <p className="field-help">Fee applied when a rider cancels after acceptance.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={handleSave} disabled={saving} className="button-primary">
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={handleReset} className="button-secondary">
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="surface-card-strong">
              <span className="page-kicker">Preview</span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Fare simulation</h2>

              <div className="mt-6 rounded-3xl border border-black/8 bg-black px-6 py-5 text-white">
                <p className="metric-label !text-white/60">Estimated Fare</p>
                <p className="mt-3 text-5xl font-extrabold tracking-tight">{formatCurrency(calculateSampleFare())}</p>
                <p className="mt-2 text-sm text-white/65">Calculated for a 10 km ride lasting 20 minutes.</p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-black/8 bg-white/80 p-5">
                  <h3 className="field-label">Current Configuration</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="table-note">Base Fare</span>
                      <strong>{formatCurrency(editedConfig.base_fare)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="table-note">Per KM</span>
                      <strong>{formatCurrency(editedConfig.per_km_rate)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="table-note">Per Minute</span>
                      <strong>{formatCurrency(editedConfig.per_minute_rate)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="table-note">Minimum Fare</span>
                      <strong>{formatCurrency(editedConfig.minimum_fare)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="table-note">Cancellation Fee</span>
                      <strong>{formatCurrency(editedConfig.cancellation_fee)}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/8 bg-white/80 p-5">
                  <h3 className="field-label">Calculation Breakdown</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="table-note">Base Fare</span>
                      <span>{formatCurrency(editedConfig.base_fare)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="table-note">Distance (10 km)</span>
                      <span>{formatCurrency(10 * editedConfig.per_km_rate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="table-note">Time (20 min)</span>
                      <span>{formatCurrency(20 * editedConfig.per_minute_rate)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-black/8 pt-3 text-base font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(calculateSampleFare())}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/8 bg-white/80 p-5">
                  <h3 className="field-label">Notes</h3>
                  <ul className="mt-4 space-y-2 text-sm text-black/70">
                    <li>Keep base fare competitive to improve conversion at pickup.</li>
                    <li>Balance distance and time rates for dense traffic corridors.</li>
                    <li>Use minimum fare and cancellation fee to protect operational margins.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

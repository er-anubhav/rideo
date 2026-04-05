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
    const config = fareConfigs.find(c => c.vehicle_type === vehicleType);
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
    const original = fareConfigs.find(c => c.vehicle_type === activeVehicle);
    setEditedConfig(original);
  };

  const calculateSampleFare = () => {
    if (!editedConfig) return 0;
    
    // Sample: 10km, 20 minutes
    const distance = 10;
    const time = 20;
    
    const fare = 
      editedConfig.base_fare +
      (distance * editedConfig.per_km_rate) +
      (time * editedConfig.per_minute_rate);
    
    return Math.max(fare, editedConfig.minimum_fare);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Fare Configuration</h1>

      {/* Vehicle Type Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {fareConfigs.map((config) => (
              <button
                key={config.vehicle_type}
                onClick={() => handleVehicleChange(config.vehicle_type)}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeVehicle === config.vehicle_type
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {config.vehicle_type.charAt(0).toUpperCase() + config.vehicle_type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Fare Configuration Form */}
        {editedConfig && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Pricing Parameters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Fare (₹)
                    </label>
                    <input
                      type="number"
                      value={editedConfig.base_fare}
                      onChange={(e) => setEditedConfig({...editedConfig, base_fare: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Initial charge when ride starts</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Per Kilometer Rate (₹/km)
                    </label>
                    <input
                      type="number"
                      value={editedConfig.per_km_rate}
                      onChange={(e) => setEditedConfig({...editedConfig, per_km_rate: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Charge per kilometer traveled</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Per Minute Rate (₹/min)
                    </label>
                    <input
                      type="number"
                      value={editedConfig.per_minute_rate}
                      onChange={(e) => setEditedConfig({...editedConfig, per_minute_rate: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Charge per minute of ride duration</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Fare (₹)
                    </label>
                    <input
                      type="number"
                      value={editedConfig.minimum_fare}
                      onChange={(e) => setEditedConfig({...editedConfig, minimum_fare: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum charge for any ride</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cancellation Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={editedConfig.cancellation_fee}
                      onChange={(e) => setEditedConfig({...editedConfig, cancellation_fee: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fee charged for ride cancellation</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Fare Preview</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="border-b pb-3">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Current Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Fare:</span>
                        <span className="font-semibold">{formatCurrency(editedConfig.base_fare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Per KM:</span>
                        <span className="font-semibold">{formatCurrency(editedConfig.per_km_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Per Minute:</span>
                        <span className="font-semibold">{formatCurrency(editedConfig.per_minute_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Minimum Fare:</span>
                        <span className="font-semibold">{formatCurrency(editedConfig.minimum_fare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cancellation Fee:</span>
                        <span className="font-semibold">{formatCurrency(editedConfig.cancellation_fee)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Sample Calculation</h4>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-3">For a ride: 10 km, 20 minutes</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Base Fare:</span>
                          <span>{formatCurrency(editedConfig.base_fare)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distance (10 km):</span>
                          <span>{formatCurrency(10 * editedConfig.per_km_rate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time (20 min):</span>
                          <span>{formatCurrency(20 * editedConfig.per_minute_rate)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold text-lg">
                          <span>Total Fare:</span>
                          <span className="text-blue-600">{formatCurrency(calculateSampleFare())}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Set competitive base fares to attract riders</li>
                      <li>• Balance per-km and per-minute rates</li>
                      <li>• Minimum fare protects short rides</li>
                      <li>• Fair cancellation fees reduce abuse</li>
                    </ul>
                  </div>
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

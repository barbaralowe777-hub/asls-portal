import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface EquipmentDetailsSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  equipmentItems: any[];
  addEquipmentItem: () => void;
  removeEquipmentItem: (index: number) => void;
  updateEquipmentItem: (index: number, field: string, value: string) => void;
}

const categories = ['Solar Panels', 'Inverters', 'Batteries'];
const batteryQtyOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
const inverterQtyOptions = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
const systemSizes = [250, 300, 350, 400, 450, 500];

const manufacturers = [
  'LG', 'Jinko Solar', 'Trina Solar', 'Canadian Solar', 
  'SunPower', 'Q CELLS', 'REC', 'Fronius', 'SMA', 'Enphase', 'Other'
];

const EquipmentDetailsSection: React.FC<EquipmentDetailsSectionProps> = ({ 
  equipmentItems,
  addEquipmentItem,
  removeEquipmentItem,
  updateEquipmentItem
}) => {
  return (
    <div className="pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">EQUIPMENT DETAILS</h2>
        <button
          type="button"
          onClick={addEquipmentItem}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </button>
      </div>

      {equipmentItems.map((item, index) => (
        <div key={index} className="bg-gray-50 p-6 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Equipment Item #{index + 1}</h3>
            {equipmentItems.length > 1 && (
              <button
                type="button"
                onClick={() => removeEquipmentItem(index)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={item.category || ''}
                onChange={(e) => updateEquipmentItem(index, 'category', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Please Select</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Size (kWh) *</label>
              <select
                value={item.asset || ''}
                onChange={(e) => updateEquipmentItem(index, 'asset', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Please Select</option>
                {systemSizes.map((size) => (
                  <option key={size} value={size}>
                    {size} kWh
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Quantity (all units) *
              </label>
              {item.category === 'Batteries' && (
                <select
                  value={item.quantity || ''}
                  onChange={(e) => updateEquipmentItem(index, 'quantity', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Qty</option>
                  {batteryQtyOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              )}
              {item.category === 'Inverters' && (
                <select
                  value={item.quantity || ''}
                  onChange={(e) => updateEquipmentItem(index, 'quantity', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Qty</option>
                  {inverterQtyOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              )}
              {(item.category === 'Solar Panels' || !item.category) && (
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateEquipmentItem(index, 'quantity', e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
              <select
                value={item.manufacturer}
                onChange={(e) => updateEquipmentItem(index, 'manufacturer', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Please Select</option>
                {manufacturers.map(mfg => (
                  <option key={mfg} value={mfg}>{mfg}</option>
                ))}
              </select>
              {item.manufacturer === 'Other' && (
                <input
                  type="text"
                  value={item.otherManufacturer || ''}
                  onChange={(e) => updateEquipmentItem(index, 'otherManufacturer', e.target.value)}
                  placeholder="Enter brand"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
              <select
                value={item.serialNumber}
                onChange={(e) => updateEquipmentItem(index, 'serialNumber', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
              >
                <option value="As Per Invoice/PO">As Per Invoice/PO</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description/Model</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateEquipmentItem(index, 'description', e.target.value)}
                placeholder="Additional details about the equipment (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            {/* Per-item total removed as requested */}
          </div>
        </div>
      ))}

      {equipmentItems.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No equipment items added yet</p>
          <button
            type="button"
            onClick={addEquipmentItem}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Equipment Item
          </button>
        </div>
      )}
    </div>
  );
};

export default EquipmentDetailsSection;

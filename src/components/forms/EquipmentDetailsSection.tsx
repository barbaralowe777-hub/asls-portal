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

const categories = [
  'Solar Panels', 'Inverters', 'Batteries',
];

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Category * (Select all that apply)</label>
              <div className="space-y-2 border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={item.category?.includes(cat) || false}
                      onChange={(e) => {
                        const currentCategories = item.category ? item.category.split(', ') : [];
                        if (e.target.checked) {
                          currentCategories.push(cat);
                        } else {
                          const index = currentCategories.indexOf(cat);
                          if (index > -1) currentCategories.splice(index, 1);
                        }
                        updateEquipmentItem(index, 'category', currentCategories.join(', '));
                      }}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Size *</label>
              <input
                type="text"
                value={item.asset}
                onChange={(e) => updateEquipmentItem(index, 'asset', e.target.value)}
                required
                placeholder="eg Solar Panels 300kW"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateEquipmentItem(index, 'quantity', e.target.value)}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (Ex GST) $ *</label>
              <input
                type="number"
                value={item.unitPrice}
                onChange={(e) => updateEquipmentItem(index, 'unitPrice', e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="Enter per unit price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
              <select
                value={item.manufacturer}
                onChange={(e) => updateEquipmentItem(index, 'manufacturer', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Please Select</option>
                {manufacturers.map(mfg => (
                  <option key={mfg} value={mfg}>{mfg}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
              <select
                value={item.serialNumber}
                onChange={(e) => updateEquipmentItem(index, 'serialNumber', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
              >
                <option value="As per Dealer Invoice/Annexure">As per Dealer Invoice/Annexure</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description/Model</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateEquipmentItem(index, 'description', e.target.value)}
                placeholder="Additional details about the equipment"
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

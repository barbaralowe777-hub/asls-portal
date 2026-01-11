import React from 'react';
// No icon imports needed in the simplified layout

interface EquipmentDetailsSectionProps {
  equipmentItems: any[];
  updateEquipmentItem: (index: number, field: string, value: string | boolean) => void;
}

const manufacturers = Array.from(
  new Set([
    // Panels
    "Canadian Solar", "Hyundai Solar", "Jinko", "Longi", "QCells", "Risen Solar", "REC", "SunPower", "SunTech", "Trina",
    // Inverters
    "Fronius", "GE", "Goodwe", "Growatt", "Huawei", "Solaredge", "SolaX Power", "Solis", "SMA",
    // Batteries (common)
    "LG", "Enphase", "AlphaESS", "Sungrow", "BYD", "Tesla", "Sonnen",
    "Other",
  ])
);

const EquipmentDetailsSection: React.FC<EquipmentDetailsSectionProps> = ({
  equipmentItems,
  updateEquipmentItem,
}) => {
  const getSystemSizeLabel = (category: string) => {
    if (category === "Solar Panels") return "System Size (Watts)";
    return "System Size (kWh)";
  };
  const getQuantityLabel = (category: string) => {
    if (category === "Solar Panels") return "Total Qty of Panels";
    return "Total Qty";
  };
  return (
    <div className="pb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">EQUIPMENT DETAILS</h2>
      </div>

      {equipmentItems.map((item, index) => (
        <div key={index} className="bg-gray-50 p-6 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">{item.category}</h3>
            <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={item.include !== false}
                onChange={(e) => updateEquipmentItem(index, "include", e.target.checked)}
                className="h-4 w-4 text-green-600 border-gray-300 rounded"
              />
              <span>Include</span>
            </label>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{getSystemSizeLabel(item.category)} *</label>
              <input
                type="text"
                value={item.asset || ""}
                onChange={(e) => updateEquipmentItem(index, "asset", e.target.value)}
                required={item.include !== false}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder={item.category === "Solar Panels" ? "e.g. 6500" : "e.g. 13.5"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getQuantityLabel(item.category)} *
              </label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateEquipmentItem(index, "quantity", e.target.value)}
                required={item.include !== false}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
              <select
                value={item.manufacturer}
                onChange={(e) => updateEquipmentItem(index, "manufacturer", e.target.value)}
                required={item.include !== false}
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
                  onChange={(e) => updateEquipmentItem(index, "otherManufacturer", e.target.value)}
                  placeholder="Enter brand"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required={item.include !== false}
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

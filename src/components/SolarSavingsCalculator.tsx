import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import { Calculator, Download, RefreshCcw, Sun } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Variant = "standard" | "reverse";
type FinanceType = "rental" | "lease" | "chattel";

type FormState = {
  electricityPrice: number;
  systemSize: number;
  systemCost: number;
  state: keyof typeof IRRADIANCE;
  feedInTariff: number;
  exportPercentage: number;
  yearlyIncrease: number;
  dailyUsage: number;
  loanTerm: number;
  residualPercent: number;
};

const IRRADIANCE = {
  VIC: 3.6,
  NSW: 3.9,
  QLD: 4.2,
  SA: 4.2,
  ACT: 4.3,
  NT: 4.4,
  TAS: 3.5,
  WA: 4.4,
} as const;

const FINANCE_TYPES: { value: FinanceType; label: string }[] = [
  { value: "rental", label: "Solar Rental" },
  { value: "lease", label: "Finance Lease" },
  { value: "chattel", label: "Chattel Mortgage" },
];

const DEFAULT_FORM: FormState = {
  electricityPrice: 0.22,
  systemSize: 30,
  systemCost: 55000,
  state: "NSW",
  feedInTariff: 0.08,
  exportPercentage: 30,
  yearlyIncrease: 4,
  dailyUsage: 120,
  loanTerm: 60,
  residualPercent: 0,
};

const getBaseRate = (amount: number): number => {
  if (amount <= 20000) return 11.9;
  if (amount <= 35000) return 10.9;
  if (amount <= 50000) return 9.9;
  return 9.5;
};

const currency = (value: number) =>
  value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const pmt = (
  rate: number,
  nperiod: number,
  pv: number,
  fv = 0,
  type = 0
): number => {
  if (rate === 0) return -(pv + fv) / nperiod;
  const pvif = Math.pow(1 + rate, nperiod);
  let p = (rate / (pvif - 1)) * -(pv * pvif + fv);
  if (type === 1) p /= 1 + rate;
  return p;
};

const futureValue = (
  monthlyValue: number,
  yearlyIncrease: number,
  months: number
) => {
  const monthlyGrowth = yearlyIncrease / 12;
  return monthlyValue * Math.pow(1 + monthlyGrowth, months);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const SolarSavingsCalculator: React.FC = () => {
  const [variant, setVariant] = useState<Variant>("standard");
  const [financeType, setFinanceType] = useState<FinanceType>("rental");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const energyInflation = form.yearlyIncrease / 100;
  const usedSolar = (100 - form.exportPercentage) / 100;
  const exportedSolar = form.exportPercentage / 100;
  const dailyProduction = form.systemSize * IRRADIANCE[form.state];

  const oldBillMonthly = useMemo(
    () => ((form.dailyUsage * form.electricityPrice) * 365.25) / 12,
    [form.dailyUsage, form.electricityPrice]
  );

  const newBillMonthly = useMemo(() => {
    const remainingUsage = Math.max(
      0,
      form.dailyUsage - dailyProduction * usedSolar
    );
    const dayCharge = remainingUsage * form.electricityPrice;
    const exportCredit = dailyProduction * exportedSolar * form.feedInTariff;
    return ((dayCharge - exportCredit) * 365.25) / 12;
  }, [
    dailyProduction,
    exportedSolar,
    form.dailyUsage,
    form.electricityPrice,
    form.feedInTariff,
    usedSolar,
  ]);

  const financeTotal =
    financeType === "chattel" ? form.systemCost * 1.1 : form.systemCost;

  const residualValue =
    financeType === "rental"
      ? 0
      : (form.systemCost * (form.residualPercent || 0)) / 100;

  const monthlyRepayment = useMemo(() => {
    const annualRate = getBaseRate(financeTotal);
    const monthlyRate = annualRate / 100 / 12;
    const principal = -financeTotal;
    const payment = pmt(
      monthlyRate,
      form.loanTerm,
      principal,
      residualValue
    );
    return Math.round(payment);
  }, [
    financeTotal,
    residualValue,
    form.loanTerm,
  ]);

  const paymentSchedule = useMemo(() => {
    const schedule: number[] = [];
    for (let month = 0; month < form.loanTerm; month += 1) {
      if (variant === "standard") {
        schedule.push(monthlyRepayment);
      } else {
        if (month < 6) schedule.push(monthlyRepayment * 0.3);
        else if (month < 12) schedule.push(monthlyRepayment * 0.55);
        else if (month < 18) schedule.push(monthlyRepayment * 0.75);
        else schedule.push(monthlyRepayment);
      }
    }
    return schedule;
  }, [form.loanTerm, monthlyRepayment, variant]);

  const monthlySavingsNow = useMemo(() => {
    const currentPayment = paymentSchedule[0] || 0;
    return oldBillMonthly - (newBillMonthly + currentPayment);
  }, [newBillMonthly, oldBillMonthly, paymentSchedule]);

  const paybackYears = useMemo(() => {
    let cumulative = 0;
    let months = 0;
    const maxMonths = 600;
    while (cumulative < form.systemCost && months < maxMonths) {
      const monthOld = futureValue(oldBillMonthly, energyInflation, months);
      const monthNew = futureValue(newBillMonthly, energyInflation, months);
      const payment = paymentSchedule[months] || 0;
      cumulative += monthOld - (monthNew + payment);
      months += 1;
    }
    return cumulative >= form.systemCost ? months / 12 : null;
  }, [
    energyInflation,
    form.systemCost,
    newBillMonthly,
    oldBillMonthly,
    paymentSchedule,
  ]);

  const chartData = useMemo(() => {
    return Array.from({ length: 10 }, (_, idx) => {
      const year = idx + 1;
      const months = year * 12;
      const annualOld = futureValue(oldBillMonthly, energyInflation, months) * 12;
      const annualNew = futureValue(newBillMonthly, energyInflation, months) * 12;
      const loanForYear = paymentSchedule
        .slice((year - 1) * 12, year * 12)
        .reduce((sum, val) => sum + val, 0);
      return {
        year: `${year} yr`,
        oldBill: Math.max(0, Math.round(annualOld)),
        newBill: Math.max(0, Math.round(annualNew)),
        loan: Math.round(loanForYear),
      };
    });
  }, [energyInflation, newBillMonthly, oldBillMonthly, paymentSchedule]);

  const tenYearBenefit = useMemo(() => {
    return chartData.reduce(
      (total, row) => total + (row.oldBill - (row.newBill + row.loan)),
      0
    );
  }, [chartData]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setFinanceType("rental");
    setVariant("standard");
  };

  const handleNumberChange = (field: keyof FormState, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generateQuote = async () => {
    const doc = new jsPDF();
    let headlineY = 24;
    try {
      const logo = await loadImage("/ASLS-logo.png");
      const width = 38;
      const ratio = logo.height / logo.width || 1;
      const height = width * ratio;
      doc.addImage(logo, "PNG", 14, 10, width, height);
      headlineY = 10 + height + 4;
    } catch {
      // ignore logo load failures
    }
    doc.setFontSize(18);
    doc.setTextColor(26, 173, 33);
    doc.text("Australian Solar Lending Solutions", 14, headlineY);
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text(
      "Solar Savings Quote • asls.net.au • 1300 000 000",
      14,
      headlineY + 8
    );
    doc.setDrawColor(26, 173, 33);
    doc.line(14, headlineY + 10, 200, headlineY + 10);
    const detailsY = headlineY + 18;
    doc.setFontSize(11);
    doc.text(
      `Variant: ${
        variant === "standard" ? "Standard (Level Rent)" : "Reverse Rent"
      }`,
      14,
      detailsY
    );
    doc.text(
      `Finance Type: ${
        FINANCE_TYPES.find((t) => t.value === financeType)?.label || ""
      }`,
      14,
      detailsY + 6
    );
    autoTable(doc, {
      startY: detailsY + 12,
      head: [["Metric", "Value"]],
      body: [
        ["System Size", `${form.systemSize} kW`],
        ["System Cost", currency(form.systemCost)],
        ["State", form.state],
        ["Electricity Price", `$${form.electricityPrice.toFixed(2)}/kWh`],
        ["Feed-In Tariff", `$${form.feedInTariff.toFixed(2)}/kWh`],
        ["Loan Term", `${form.loanTerm} months`],
        ["Monthly Repayment", currency(monthlyRepayment)],
        [
          "Year 1 Average Payment",
          currency(
            Math.round(
              paymentSchedule.slice(0, 12).reduce((sum, v) => sum + v, 0) / 12
            )
          ),
        ],
        ["Monthly Bill (Before)", currency(oldBillMonthly)],
        ["Monthly Bill (After)", currency(newBillMonthly)],
        ["Monthly Savings (Today)", currency(monthlySavingsNow)],
        [
          "10 Year Net Benefit",
          currency(Math.round(tenYearBenefit)),
        ],
      ],
    });
    doc.save("asls-solar-quote.pdf");
  };

  const metrics = [
    {
      label: "Monthly Repayment",
      value: currency(monthlyRepayment),
      sublabel:
        variant === "reverse"
          ? "Base rent before reverse-rent discount"
          : "Matches Equipment Finance calculator formula",
    },
    {
      label: "Year 1 Avg Payment",
      value: currency(
        Math.round(
          (paymentSchedule.slice(0, 12).reduce((sum, v) => sum + v, 0) || 0) /
            12
        )
      ),
      sublabel:
        variant === "reverse"
          ? "Discounted rent during intro period"
          : "Same as monthly repayment",
    },
    {
      label: "Monthly Savings Now",
      value: currency(monthlySavingsNow),
      sublabel: "Old bill - (new bill + rent)",
    },
    {
      label: "10 Year Net Benefit",
      value: currency(Math.round(tenYearBenefit)),
      sublabel: "Includes energy inflation assumption",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
            Solar profitability
          </p>
          <h2 className="text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <Sun className="h-7 w-7 text-blue-600" />
            Solar Savings Calculator
          </h2>
          <p className="text-gray-600">
            Compare the customer’s current energy spend with a financed solar system.
          </p>
        </div>
        <div className="flex gap-2">
          {(["standard", "reverse"] as Variant[]).map((key) => (
            <button
              key={key}
              onClick={() => setVariant(key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                variant === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {key === "standard" ? "Standard" : "Reverse Rent"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calculator className="h-6 w-6 text-blue-600" />
              Inputs
            </CardTitle>
            <CardDescription>
              Use the same data customers provide via their bills or proposals.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Finance Product</Label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={financeType}
                  onChange={(event) =>
                    setFinanceType(event.target.value as FinanceType)
                  }
                >
                  {FINANCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Loan Term (months)</Label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={form.loanTerm}
                  onChange={(event) =>
                    handleNumberChange("loanTerm", Number(event.target.value))
                  }
                >
                  {[12, 24, 36, 48, 60, 72, 84].map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>System Cost (incl. GST)</Label>
                <Input
                  type="number"
                  value={form.systemCost}
                  onChange={(event) =>
                    handleNumberChange("systemCost", Number(event.target.value))
                  }
                />
              </div>
              <div>
                <Label>System Size (kW)</Label>
                <Input
                  type="number"
                  value={form.systemSize}
                  onChange={(event) =>
                    handleNumberChange("systemSize", Number(event.target.value))
                  }
                />
              </div>
              <div>
                <Label>Electricity Price ($/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.electricityPrice}
                  onChange={(event) =>
                    handleNumberChange(
                      "electricityPrice",
                      Number(event.target.value)
                    )
                  }
                />
              </div>
              <div>
                <Label>Daily Usage (kWh)</Label>
                <Input
                  type="number"
                  value={form.dailyUsage}
                  onChange={(event) =>
                    handleNumberChange("dailyUsage", Number(event.target.value))
                  }
                />
              </div>
              <div>
                <Label>State</Label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={form.state}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      state: event.target.value as keyof typeof IRRADIANCE,
                    }))
                  }
                >
                  {Object.keys(IRRADIANCE).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Feed-in Tariff ($/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.feedInTariff}
                  onChange={(event) =>
                    handleNumberChange(
                      "feedInTariff",
                      Number(event.target.value)
                    )
                  }
                />
              </div>
              <div>
                <Label>Energy Inflation (% per year)</Label>
                <Input
                  type="number"
                  value={form.yearlyIncrease}
                  onChange={(event) =>
                    handleNumberChange(
                      "yearlyIncrease",
                      Number(event.target.value)
                    )
                  }
                />
              </div>
              <div>
                <Label>Exported Energy (%)</Label>
                <div className="mt-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.exportPercentage}
                    onChange={(event) =>
                      handleNumberChange(
                        "exportPercentage",
                        Number(event.target.value)
                      )
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>On-site usage {Math.round(usedSolar * 100)}%</span>
                    <span>Exported {form.exportPercentage}%</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Feed-in Export</Label>
                <p className="text-sm text-gray-500 mt-1">
                  Assumes {Math.round(exportedSolar * 100)}% of production is exported.
                </p>
              </div>
              {financeType !== "rental" && (
                <div>
                  <Label>Residual / Balloon (%)</Label>
                  <Input
                    type="number"
                    value={form.residualPercent}
                    onChange={(event) =>
                      handleNumberChange(
                        "residualPercent",
                        Number(event.target.value)
                      )
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="flex items-center gap-2"
                onClick={generateQuote}
              >
                <Download className="h-4 w-4" /> Generate Quote
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="pt-6 pb-6">
                <p className="text-xs uppercase text-gray-500">
                  {metric.label}
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {metric.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">{metric.sublabel}</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase text-gray-500">
                Payback Period
              </p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">
                {paybackYears ? `${paybackYears.toFixed(1)} years` : "n/a"}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Cumulative savings required to match system cost.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl">Savings Projection</CardTitle>
          <CardDescription>
            Bills and repayments indexed at {form.yearlyIncrease}% energy inflation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  tickFormatter={(value) =>
                    `$${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value: number) => currency(value)}
                />
                <Legend />
                <Bar
                  dataKey="newBill"
                  stackId="a"
                  fill="#0ea5e9"
                  name="New Utility Bill"
                />
                <Bar
                  dataKey="loan"
                  stackId="a"
                  fill="#14b8a6"
                  name="Loan Payments"
                />
                <Line
                  dataKey="oldBill"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Old Utility Bill"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SolarSavingsCalculator;

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type RepaymentCalculatorProps = {
  variant?: "standalone" | "embedded";
};

const RepaymentCalculator: React.FC<RepaymentCalculatorProps> = ({
  variant = "standalone",
}) => {
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [loanTerm, setLoanTerm] = useState<string>("60");
  const [industry, setIndustry] = useState<string>("General");
  const [underTwoYears, setUnderTwoYears] = useState<boolean | null>(null);
  const [monthlyRepayment, setMonthlyRepayment] = useState<number | null>(null);
  const [weeklyRepayment, setWeeklyRepayment] = useState<number | null>(null);

  const BROKERAGE_MARGIN = 0.055; // 5.5% brokerage uplift
  const UPLIFT_INDUSTRIES = ["Beauty", "Gym", "Hospitality"]; // +1% uplift

  // Factor rate table (per $100, monthly) by amount band and term
  const FACTOR_TABLE: Record<
    number,
    Array<{ min: number; max: number; factor: number }>
  > = {
    84: [
      { min: 0, max: 20000, factor: 1.743 },
      { min: 20000.01, max: 35000, factor: 1.692 },
      { min: 35000.01, max: 50000, factor: 1.641 },
      { min: 50000.01, max: 1000000, factor: 1.622 },
    ],
    72: [
      { min: 0, max: 20000, factor: 1.931 },
      { min: 20000.01, max: 35000, factor: 1.881 },
      { min: 35000.01, max: 50000, factor: 1.832 },
      { min: 50000.01, max: 1000000, factor: 1.813 },
    ],
    60: [
      { min: 0, max: 20000, factor: 2.195 },
      { min: 20000.01, max: 35000, factor: 2.15 },
      { min: 35000.01, max: 50000, factor: 2.102 },
      { min: 50000.01, max: 1000000, factor: 2.084 },
    ],
    48: [
      { min: 0, max: 20000, factor: 2.603 },
      { min: 20000.01, max: 35000, factor: 2.556 },
      { min: 35000.01, max: 50000, factor: 2.511 },
      { min: 50000.01, max: 1000000, factor: 2.493 },
    ],
    36: [
      { min: 0, max: 20000, factor: 3.284 },
      { min: 20000.01, max: 35000, factor: 3.24 },
      { min: 35000.01, max: 50000, factor: 3.196 },
      { min: 50000.01, max: 1000000, factor: 3.178 },
    ],
    24: [
      { min: 0, max: 20000, factor: 4.657 },
      { min: 20000.01, max: 35000, factor: 4.614 },
      { min: 35000.01, max: 50000, factor: 4.572 },
      { min: 50000.01, max: 1000000, factor: 4.555 },
    ],
  };

  const getFactor = (amount: number, months: number): number | null => {
    const rows = FACTOR_TABLE[months];
    if (!rows) return null;
    const tier = rows.find((row) => amount >= row.min && amount <= row.max);
    return tier ? tier.factor : null;
  };

  const calculateRepayment = () => {
    const amount = parseFloat(loanAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid loan amount");
      return;
    }
    if (underTwoYears === null) {
      alert("Please confirm if the ABN has been registered for less than 2 years.");
      return;
    }
    const months = parseInt(loanTerm);
    const factor = getFactor(amount, months);
    if (!factor) {
      alert("No rate available for that amount/term. Please choose a supported term between 24–84 months.");
      return;
    }

    // Factor-based repayment: (factor% of NAV) with brokerage uplift
    const upliftMultiplier =
      1 +
      (UPLIFT_INDUSTRIES.includes(industry) ? 0.01 : 0) +
      (underTwoYears ? 0.01 : 0);
    const adjustedFactor = factor * upliftMultiplier;
    const monthly = (adjustedFactor / 100) * amount * (1 + BROKERAGE_MARGIN);

    const weekly = (monthly * 12) / 52;

    setMonthlyRepayment(monthly);
    setWeeklyRepayment(weekly);
  };

  const resetCalculator = () => {
    setLoanAmount("");
    setLoanTerm("60");
    setIndustry("General");
    setUnderTwoYears(null);
    setMonthlyRepayment(null);
    setWeeklyRepayment(null);
  };

  const currency = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

  const isEmbedded = variant === "embedded";
  const outerClasses = isEmbedded
    ? "bg-gradient-to-br from-white to-emerald-50 rounded-2xl p-4 sm:p-6"
    : "min-h-screen bg-gray-50 py-10 px-4";
  const innerClasses = isEmbedded
    ? "max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
    : "max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8";
  const cardClasses = isEmbedded
    ? "bg-white shadow-sm border border-gray-100"
    : "bg-white shadow-md border border-gray-100";

  return (
    <div className={outerClasses}>
      <div className={innerClasses}>
        {/* Left: Input Section */}
        <Card className={cardClasses}>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="h-6 w-6 text-blue-600" />
              Equipment Finance Calculator
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Factor-based estimate using ASLS rate card.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* Loan Amount */}
            <div>
              <Label className="text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Loan Amount
              </Label>
              <Input
                type="number"
                placeholder="Enter loan amount"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="text-lg py-6"
              />
            </div>

            {/* Loan Term */}
            <div>
              <Label className="text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Loan Term
              </Label>
              <Select value={loanTerm} onValueChange={setLoanTerm}>
                <SelectTrigger className="text-lg py-6">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {[24, 36, 48, 60, 72, 84].map((term) => (
                    <SelectItem key={term} value={term.toString()}>
                      {term} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div>
              <Label className="text-lg font-medium text-gray-700 mb-1 flex items-center gap-2">
                Industry
              </Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="text-lg py-6">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Beauty">Beauty</SelectItem>
                  <SelectItem value="Gym">Gym</SelectItem>
                  <SelectItem value="Hospitality">Hospitality</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ABN age override */}
            <div className="flex flex-col text-sm text-gray-700">
              <span className="font-medium">
                ABN registered <span className="font-bold uppercase">LESS</span> than 2 years? *
              </span>
              <div className="flex items-center gap-4 mt-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="abnAge"
                    value="yes"
                    checked={underTwoYears === true}
                    onChange={() => setUnderTwoYears(true)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="abnAge"
                    value="no"
                    checked={underTwoYears === false}
                    onChange={() => setUnderTwoYears(false)}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  No
                </label>
              </div>
            </div>

            {/* Industry */}
            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={calculateRepayment}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
              >
                Calculate
              </Button>
              <Button
                variant="outline"
                onClick={resetCalculator}
                className="text-lg py-6"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Results Section */}
        <Card className="bg-white shadow-md border border-gray-100">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              Repayment Results
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Estimated repayments (incl. GST)
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            {monthlyRepayment ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <h2 className="text-5xl font-bold text-blue-700">
                  {currency(monthlyRepayment)}
                </h2>
                <p className="text-gray-600 text-lg">
                  per month for {loanTerm} months
                </p>
                <p className="text-gray-600 text-lg">
                  Weekly: <span className="font-medium">{currency(weeklyRepayment || 0)}</span>
                </p>
                <Alert className="mt-6">
                  <AlertDescription className="text-base text-gray-700">
                    * A one-time documentation fee of{" "}
                    <span className="font-semibold">$385 (incl. GST)</span>{" "}
                    is payable on settlement with your first repayment.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                <Calculator className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter details and click “Calculate” to view results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-100">
          <CardContent className="p-5">
            <h3 className="text-blue-600 font-semibold mb-1 text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Flexible Terms
            </h3>
            <p className="text-gray-600 text-base">
              Choose from 12 to 84 months to best suit your business cash flow.
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-5">
            <h3 className="text-blue-600 font-semibold mb-1 text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fast Processing
            </h3>
            <p className="text-gray-600 text-base">
              Quick approval and settlement for your equipment finance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepaymentCalculator;

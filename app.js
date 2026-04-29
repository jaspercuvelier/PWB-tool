const DATA_URL = "data/tarieven.csv";
const DEFAULT_TABLE = "tijdelijk-standplaats";
const DATA_VERSION = "toestand op 1-3-2026, index 2,1647";

const elements = {
  form: document.querySelector("#calculatorForm"),
  budgetField: document.querySelector("#budgetField"),
  budget: document.querySelector("#budgetInput"),
  unitsField: document.querySelector("#unitsField"),
  units: document.querySelector("#unitsInput"),
  unitsInputLabel: document.querySelector("#unitsInputLabel"),
  unitsPrefix: document.querySelector("#unitsPrefix"),
  personnelTypeField: document.querySelector("#personnelTypeField"),
  allowance: document.querySelector("#allowanceSelect"),
  seniority: document.querySelector("#seniorityInput"),
  seniorityDown: document.querySelector("#seniorityDown"),
  seniorityUp: document.querySelector("#seniorityUp"),
  dataStatus: document.querySelector("#dataStatus"),
  unitLabel: document.querySelector("#unitLabel"),
  mainResult: document.querySelector("#mainResult"),
  metricOneLabel: document.querySelector("#metricOneLabel"),
  metricTwoLabel: document.querySelector("#metricTwoLabel"),
  metricThreeLabel: document.querySelector("#metricThreeLabel"),
  wholeUnits: document.querySelector("#wholeUnits"),
  annualCost: document.querySelector("#annualCost"),
  remainingBudget: document.querySelector("#remainingBudget"),
  calculationLine: document.querySelector("#calculationLine"),
  maxSeniorityLine: document.querySelector("#maxSeniorityLine"),
};

let rows = [];
let groupedRows = new Map();

const euroFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const unitFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat("nl-BE", {
  maximumFractionDigits: 0,
});

init();

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Kon ${DATA_URL} niet laden.`);
    }

    const csv = await response.text();
    rows = parseDelimited(csv).map(normalizeRow);
    groupedRows = groupByTable(rows);
    applyQueryParams();
    wireEvents();
    elements.dataStatus.textContent = `Tarieven: ${DATA_VERSION}`;
    updateResult();
  } catch (error) {
    elements.dataStatus.textContent = "Tarieven niet geladen";
    elements.calculationLine.textContent = "Start deze map via een lokale webserver of publiceer ze op GitHub Pages.";
    elements.calculationLine.classList.add("is-warning");
    console.error(error);
  }
}

function wireEvents() {
  elements.form.addEventListener("input", updateResult);
  elements.form.addEventListener("change", updateResult);

  elements.seniorityDown.addEventListener("click", () => stepSeniority(-1));
  elements.seniorityUp.addEventListener("click", () => stepSeniority(1));

  elements.budget.addEventListener("blur", () => {
    const budget = parseFlexibleNumber(elements.budget.value);
    if (Number.isFinite(budget)) {
      elements.budget.value = budget.toLocaleString("nl-BE", {
        minimumFractionDigits: budget % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
    }
  });

  elements.units.addEventListener("blur", () => {
    const units = parseFlexibleNumber(elements.units.value);
    if (Number.isFinite(units)) {
      elements.units.value = units.toLocaleString("nl-BE", {
        minimumFractionDigits: units % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
    }
  });
}

function parseDelimited(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = splitCsvLine(lines[0], ";");

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, ";");
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
}

function splitCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeRow(row) {
  return {
    tableId: row.table_id,
    tableLabel: row.table_label,
    seniority: Number(row.ancienniteit),
    noemer24Year: parseFlexibleNumber(row.noemer24_jaar),
    noemer24Month: parseFlexibleNumber(row.noemer24_maand),
    noemer36Year: parseFlexibleNumber(row.noemer36_jaar),
    noemer36Month: parseFlexibleNumber(row.noemer36_maand),
  };
}

function parseFlexibleNumber(value) {
  if (typeof value !== "string") {
    return Number(value);
  }

  let cleaned = value
    .trim()
    .replace(/\s/g, "");

  const commaIndex = cleaned.lastIndexOf(",");
  const dotIndex = cleaned.lastIndexOf(".");

  if (commaIndex > -1 && dotIndex > -1) {
    cleaned = commaIndex > dotIndex
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (commaIndex > -1) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > -1) {
    const decimals = cleaned.length - dotIndex - 1;
    if (decimals > 2) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  return Number(cleaned);
}

function groupByTable(dataRows) {
  const groups = new Map();

  for (const row of dataRows) {
    if (!groups.has(row.tableId)) {
      groups.set(row.tableId, {
        id: row.tableId,
        label: row.tableLabel,
        rows: [],
      });
    }

    groups.get(row.tableId).rows.push(row);
  }

  for (const group of groups.values()) {
    group.rows.sort((a, b) => a.seniority - b.seniority);
  }

  return groups;
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const budget = params.get("budget");
  const units = params.get("lestijden") ?? params.get("uren") ?? params.get("units");
  const mode = params.get("modus") ?? params.get("mode");
  const seniority = params.get("ancienniteit") ?? params.get("seniority");
  const denominator = params.get("noemer") ?? params.get("denominator");
  const personnelType = params.get("statuut") ?? params.get("type");
  const allowance = params.get("toelage") ?? params.get("allowance");
  const table = params.get("table");

  if (budget) {
    elements.budget.value = budget;
  }

  if (units) {
    elements.units.value = units;
  }

  if (mode === "budget" || mode === "cost") {
    document.querySelector(`input[name='calculationMode'][value='${mode}']`).checked = true;
  } else if (units) {
    document.querySelector("input[name='calculationMode'][value='cost']").checked = true;
  }

  if (seniority) {
    elements.seniority.value = seniority;
  }

  if (denominator === "24" || denominator === "36") {
    document.querySelector(`input[name='denominator'][value='${denominator}']`).checked = true;
  }

  if (table && groupedRows.has(table)) {
    setTableSelection(table);
  }

  if (personnelType === "tijdelijk" || personnelType === "vast") {
    document.querySelector(`input[name='personnelType'][value='${personnelType}']`).checked = true;
  }

  if (allowance === "standplaats" || allowance === "haardgeld") {
    elements.allowance.value = allowance;
  }
}

function stepSeniority(direction) {
  const min = Number(elements.seniority.min);
  const max = Number(elements.seniority.max);
  const current = Number(elements.seniority.value || 0);
  elements.seniority.value = Math.min(max, Math.max(min, current + direction));
  updateResult();
}

function updateResult() {
  if (!groupedRows.size) {
    return;
  }

  const mode = selectedMode();
  const denominator = document.querySelector("input[name='denominator']:checked").value;
  const seniority = clamp(Math.round(Number(elements.seniority.value || 0)), 0, 36);

  elements.seniority.value = seniority;
  updateModeUi(mode, denominator);

  if (mode === "cost") {
    updateCostResult(seniority, denominator);
    return;
  }

  updateBudgetResult(seniority, denominator);
}

function updateBudgetResult(seniority, denominator) {
  const budget = parseFlexibleNumber(elements.budget.value);
  const table = groupedRows.get(selectedTableId());
  const row = table?.rows.find((item) => item.seniority === seniority);

  if (!Number.isFinite(budget) || budget < 0 || !row) {
    renderEmptyState();
    return;
  }

  const unitName = denominator === "24" ? "LT" : "uur";
  const unitText = denominator === "24" ? "lestijden per week" : "uren per week";
  const annualCost = denominator === "24" ? row.noemer24Year : row.noemer36Year;
  const monthlyCost = denominator === "24" ? row.noemer24Month : row.noemer36Month;
  const units = budget / annualCost;
  const wholeUnits = Math.floor(units + Number.EPSILON);
  const remaining = budget - wholeUnits * annualCost;
  const maxOne = maxSeniorityForOneUnit(table.rows, denominator, budget);

  elements.unitLabel.textContent = unitText;
  elements.mainResult.textContent = `${unitFormatter.format(units)} ${unitName}/week`;
  elements.metricOneLabel.textContent = "Volledig inzetbaar";
  elements.metricTwoLabel.textContent = "Kostprijs per jaar";
  elements.metricThreeLabel.textContent = "Restbudget na afronding";
  elements.wholeUnits.textContent = `${wholeFormatter.format(wholeUnits)} ${unitName}/week`;
  elements.annualCost.textContent = euroFormatter.format(annualCost);
  elements.remainingBudget.textContent = euroFormatter.format(Math.max(0, remaining));
  elements.calculationLine.classList.remove("is-warning");
  elements.calculationLine.textContent = `${euroFormatter.format(budget)} / ${euroFormatter.format(annualCost)} = ${unitFormatter.format(units)} ${unitName}/week. De maandkost in de tabel is ${euroFormatter.format(monthlyCost)}.`;

  if (maxOne) {
    elements.maxSeniorityLine.classList.remove("is-warning");
    elements.maxSeniorityLine.textContent = `Voor 1 ${unitName}/week past dit budget tot en met ${maxOne.seniority} jaar anciënniteit (${euroFormatter.format(rateFor(maxOne, denominator))} per jaar).`;
  } else {
    elements.maxSeniorityLine.classList.add("is-warning");
    elements.maxSeniorityLine.textContent = `Dit budget volstaat niet voor 1 ${unitName}/week aan 0 jaar anciënniteit.`;
  }
}

function updateCostResult(seniority, denominator) {
  const requestedUnits = parseFlexibleNumber(elements.units.value);
  const allowance = elements.allowance.value;
  const temporaryRow = rowFor(`tijdelijk-${allowance}`, seniority);
  const permanentRow = rowFor(`vast-${allowance}`, seniority);
  const unitName = denominator === "24" ? "LT" : "uur";
  const unitText = denominator === "24" ? "lestijden per week" : "uren per week";

  if (!Number.isFinite(requestedUnits) || requestedUnits < 0 || !temporaryRow || !permanentRow) {
    renderEmptyState("Gebruik een positief aantal en een anciënniteit tussen 0 en 36.");
    return;
  }

  const temporaryRate = rateFor(temporaryRow, denominator);
  const permanentRate = rateFor(permanentRow, denominator);
  const temporaryCost = requestedUnits * temporaryRate;
  const permanentCost = requestedUnits * permanentRate;
  const difference = temporaryCost - permanentCost;

  elements.unitLabel.textContent = "Gevraagde inzet";
  elements.mainResult.textContent = `${unitFormatter.format(requestedUnits)} ${unitName}/week`;
  elements.metricOneLabel.textContent = "Tijdelijk personeel";
  elements.metricTwoLabel.textContent = "Vast personeel";
  elements.metricThreeLabel.textContent = difference >= 0 ? "Meerkost tijdelijk" : "Meerkost vast";
  elements.wholeUnits.textContent = euroFormatter.format(temporaryCost);
  elements.annualCost.textContent = euroFormatter.format(permanentCost);
  elements.remainingBudget.textContent = euroFormatter.format(Math.abs(difference));
  elements.calculationLine.classList.remove("is-warning");
  elements.calculationLine.textContent = `Tijdelijk personeel met ${seniority} jaar anciënniteit: ${unitFormatter.format(requestedUnits)} ${unitName}/week x ${euroFormatter.format(temporaryRate)} = ${euroFormatter.format(temporaryCost)} per jaar.`;
  elements.maxSeniorityLine.classList.remove("is-warning");
  elements.maxSeniorityLine.textContent = `Vast personeel met ${seniority} jaar anciënniteit: ${unitFormatter.format(requestedUnits)} ${unitName}/week x ${euroFormatter.format(permanentRate)} = ${euroFormatter.format(permanentCost)} per jaar.`;
}

function selectedMode() {
  return document.querySelector("input[name='calculationMode']:checked").value;
}

function updateModeUi(mode, denominator) {
  const isCostMode = mode === "cost";
  const unitText = denominator === "24" ? "lestijden" : "uren";
  const unitName = denominator === "24" ? "LT/week" : "uur/week";

  elements.budgetField.classList.toggle("is-hidden", isCostMode);
  elements.unitsField.classList.toggle("is-hidden", !isCostMode);
  elements.personnelTypeField.classList.toggle("is-hidden", isCostMode);
  elements.unitsInputLabel.textContent = `Gewenste ${unitText} per week`;
  elements.unitsPrefix.textContent = unitName;
}

function selectedTableId() {
  const personnelType = document.querySelector("input[name='personnelType']:checked").value;
  return `${personnelType}-${elements.allowance.value}`;
}

function setTableSelection(tableId) {
  const [personnelType, allowance] = tableId.split("-");
  const personnelTypeControl = document.querySelector(`input[name='personnelType'][value='${personnelType}']`);

  if (personnelTypeControl) {
    personnelTypeControl.checked = true;
  }

  if (allowance === "standplaats" || allowance === "haardgeld") {
    elements.allowance.value = allowance;
  }
}

function rowFor(tableId, seniority) {
  return groupedRows.get(tableId)?.rows.find((item) => item.seniority === seniority);
}

function renderEmptyState(message = "Gebruik een positief budget en een anciënniteit tussen 0 en 36.") {
  elements.mainResult.textContent = "-";
  elements.metricOneLabel.textContent = "Volledig inzetbaar";
  elements.metricTwoLabel.textContent = "Kostprijs per jaar";
  elements.metricThreeLabel.textContent = "Restbudget na afronding";
  elements.wholeUnits.textContent = "-";
  elements.annualCost.textContent = "-";
  elements.remainingBudget.textContent = "-";
  elements.calculationLine.classList.add("is-warning");
  elements.calculationLine.textContent = message;
  elements.maxSeniorityLine.textContent = "";
}

function maxSeniorityForOneUnit(tableRows, denominator, budget) {
  return tableRows
    .filter((row) => rateFor(row, denominator) <= budget + Number.EPSILON)
    .sort((a, b) => b.seniority - a.seniority)[0];
}

function rateFor(row, denominator) {
  return denominator === "24" ? row.noemer24Year : row.noemer36Year;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

import { Transaction, CycleType, DashboardMetadata } from '../types';

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Handle "R$ 15,90", "15,9", "15.9", "15"
  // Remove quotes, R$, whitespace, dots (thousands), then replace comma with dot
  let clean = value.replace(/['"]/g, '').replace('R$', '').trim();
  
  // If format is 1.234,56 (Brazilian thousands), remove dot, swap comma
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // If just comma decimal "15,9"
    clean = clean.replace(',', '.');
  }
  
  return parseFloat(clean) || 0;
};

export const determineCycleType = (productName: string): CycleType => {
  if (!productName) return CycleType.UNKNOWN;
  const lower = productName.toLowerCase();
  // Check for explicit "LAVA" or "SECA" anywhere in the string
  if (lower.includes('lava')) return CycleType.WASH;
  if (lower.includes('seca')) return CycleType.DRY;
  return CycleType.UNKNOWN;
};

export interface ParseResult {
  metadata: DashboardMetadata;
  transactions: Transaction[];
}

enum CsvFormat {
  SELF_SERVICE = 'SELF_SERVICE',
  ATTENDANT = 'ATTENDANT',
  UNKNOWN = 'UNKNOWN'
}

const splitCsvLine = (line: string): string[] => {
  // Robust CSV Split: splits by comma ONLY if not inside quotes
  return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
};

const isLineEmpty = (line: string): boolean => {
  if (!line || !line.trim()) return true;
  // Check if line is just delimiters like ",,,,,,,,,"
  const stripped = line.replace(/,/g, '').trim();
  return stripped.length === 0;
};

const detectFormat = (lines: string[]): CsvFormat => {
  // Scan first 5000 lines for characteristic headers (increased depth for empty lines)
  const limit = Math.min(lines.length, 5000);
  for (let i = 0; i < limit; i++) {
    const line = lines[i];
    // Self Service Signature: "Produtos" and "Total Venda" and "Data"
    if (line.includes('Produtos') && line.includes('Total Venda') && line.includes('Data')) {
      return CsvFormat.SELF_SERVICE;
    }
    // Attendant Signature: "Nome Terminal" and "Venda (R$)" and "Data"
    if (line.includes('Nome Terminal') && line.includes('Venda (R$)') && line.includes('Data')) {
      return CsvFormat.ATTENDANT;
    }
  }
  return CsvFormat.UNKNOWN;
};

const extractPeriod = (lines: string[]): string => {
  // Scan first 5000 lines for metadata (increased depth)
  const limit = Math.min(lines.length, 5000);
  for (let i = 0; i < limit; i++) {
    if (lines[i].includes("Vendas de")) {
      const parts = lines[i].split(",");
      // Filter out empty parts to find the text part
      const periodPart = parts.find(p => p.includes("Vendas de"));
      if (periodPart) {
        return periodPart.replace("Vendas de ", "").replace(" ate ", " - ").trim();
      }
    }
  }
  return "Período não identificado";
};

export const parseCSV = (csvText: string): ParseResult => {
  const lines = csvText.split(/\r\n|\n/);
  const format = detectFormat(lines);
  const period = extractPeriod(lines);
  const transactions: Transaction[] = [];
  let unitName = "Unidade Desconhecida";

  // Determine Header Row Index dynamically
  let headerIndex = -1;
  const limit = Math.min(lines.length, 5000);
  
  for (let i = 0; i < limit; i++) {
    // Strong signal for header row in both formats
    if (lines[i].includes('Data') && lines[i].includes('Hora')) {
      headerIndex = i;
      break;
    }
  }

  // If we couldn't find a header but detected a format, try to guess or fail gracefully
  if (headerIndex === -1 && format !== CsvFormat.UNKNOWN) {
     console.warn("Format detected but header row not found. Parsing might fail.");
  }

  const startIndex = headerIndex === -1 ? 0 : headerIndex + 1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or lines that are just commas
    if (isLineEmpty(line)) continue;
    if (line.startsWith("Total")) continue;

    const cols = splitCsvLine(line);

    // --- Parsing Logic Based on Format ---
    let machineRaw = "";
    let amountRaw = "";
    let dateRaw = "";
    let timeRaw = "";
    let paymentRaw = "";

    if (format === CsvFormat.SELF_SERVICE) {
      // Self Service Mapping
      // Index 6: "Mola"/"Produto" (e.g., "4 - LAVA - 04") -> Used for Machine Name & Cycle Type
      // Index 9: "Total Venda"
      // Index 10: "Data"
      // Index 11: "Hora"
      // Index 4: "Pagamento"
      if (cols.length < 12) continue;
      machineRaw = cols[6]?.replace(/['"]/g, '').trim();
      amountRaw = cols[9]?.replace(/['"]/g, '').trim();
      dateRaw = cols[10]?.replace(/['"]/g, '').trim();
      timeRaw = cols[11]?.replace(/['"]/g, '').trim();
      paymentRaw = cols[4]?.replace(/['"]/g, '').trim();

      // Try extract Unit Name from Metadata lines if not set
      if (unitName === "Unidade Desconhecida" && lines.length > 0) {
        // Scan a bit to find Operator
        for(let j=0; j<Math.min(lines.length, 50); j++) {
            if (lines[j].startsWith("Operador:")) {
                const parts = splitCsvLine(lines[j]);
                if (parts[1]) {
                    unitName = parts[1].replace(/['"]/g, "").trim();
                    break;
                }
            }
        }
      }

    } else if (format === CsvFormat.ATTENDANT) {
      // Attendant Mapping
      // Index 0: "Cliente" (Contains Unit Name repeated)
      // Index 4: "Nome Terminal" (e.g., "LAVA - 14")
      // Index 5: "Pagamento"
      // Index 8: "Venda (R$)"
      // Index 12: "Data"
      // Index 13: "Hora"
      if (cols.length < 14) continue;
      
      // Valid row check: must have a date in col 12
      if (!cols[12] || !cols[12].includes('/')) continue;

      machineRaw = cols[4]?.replace(/['"]/g, '').trim();
      amountRaw = cols[8]?.replace(/['"]/g, '').trim();
      dateRaw = cols[12]?.replace(/['"]/g, '').trim();
      timeRaw = cols[13]?.replace(/['"]/g, '').trim();
      paymentRaw = cols[5]?.replace(/['"]/g, '').trim();

      // Extract Unit Name from the first valid data row
      if (unitName === "Unidade Desconhecida" && cols[0]) {
        const potentialName = cols[0].replace(/['"]/g, "").trim();
        if (potentialName && potentialName !== "Cliente") {
            unitName = potentialName;
        }
      }
    } else {
      // Unknown format, skip
      continue;
    }

    // --- Common Processing ---

    // Strict check: Must have a valid date (dd/mm/yyyy)
    // Sometimes headers repeat or garbage data exists
    if (!dateRaw || !dateRaw.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;
    
    const amount = parseCurrency(amountRaw);
    const cycleType = determineCycleType(machineRaw);
    
    const dateParts = dateRaw.split('/');
    const timeParts = timeRaw ? timeRaw.split(':') : ['00', '00', '00'];
    
    if (dateParts.length !== 3) continue;

    const jsDate = new Date(
      parseInt(dateParts[2]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[0]),
      parseInt(timeParts[0] || '0'),
      parseInt(timeParts[1] || '0'),
      parseInt(timeParts[2] || '0')
    );

    transactions.push({
      id: `${i}-${dateRaw}-${timeRaw}-${machineRaw}`,
      date: jsDate,
      rawDate: dateRaw,
      rawTime: timeRaw,
      productName: machineRaw,
      type: cycleType,
      amount: amount,
      paymentMethod: paymentRaw,
      machine: machineRaw, 
      dayOfWeek: jsDate.getDay()
    });
  }

  return { 
    metadata: { 
      unitName, 
      period,
      reportType: format === CsvFormat.ATTENDANT ? 'ATTENDANT' : 'SELF_SERVICE'
    }, 
    transactions 
  };
};
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { TollBooth, Transaction, VehicleType, RfidAccount, DashboardStats } from "./src/types";

const app = express();
const PORT = 3000;

// Serve json payloads
app.use(express.json());

// ----------------------------------------------------
// LOCAL IN-MEMORY TOLL DATABASE (Indian Rupee - INR Rates)
// ----------------------------------------------------
const BOOTHS: TollBooth[] = [
  {
    id: "booth-1",
    name: "Akshay NH-44 Express (FASTag Only)",
    status: "active",
    baseRate: { car: 80.0, truck: 320.0, bus: 240.0, motorcycle: 40.0 },
    rateMultiplier: 1.25, // Peak-hour congestion premium
    totalRevenue: 24500.0,
    totalVehicles: 340,
  },
  {
    id: "booth-2",
    name: "Akshay NH-44 Cash/Mixed Lane",
    status: "active",
    baseRate: { car: 70.0, truck: 300.0, bus: 220.0, motorcycle: 35.0 },
    rateMultiplier: 1.0,
    totalRevenue: 18400.0,
    totalVehicles: 412,
  },
  {
    id: "booth-3",
    name: "Mumbai-Pune Exp Expressway (FASTag)",
    status: "active",
    baseRate: { car: 120.0, truck: 450.0, bus: 350.0, motorcycle: 60.0 },
    rateMultiplier: 1.0,
    totalRevenue: 15605.0,
    totalVehicles: 288,
  },
  {
    id: "booth-4",
    name: "Mumbai-Pune Exp Cash Lane",
    status: "active",
    baseRate: { car: 100.0, truck: 420.0, bus: 320.0, motorcycle: 50.0 },
    rateMultiplier: 1.0,
    totalRevenue: 19800.0,
    totalVehicles: 445,
  },
  {
    id: "booth-5",
    name: "VIP / Emergency Lane",
    status: "maintenance",
    baseRate: { car: 60.0, truck: 280.0, bus: 200.0, motorcycle: 30.0 },
    rateMultiplier: 1.0,
    totalRevenue: 4200.0,
    totalVehicles: 95,
  }
];

const RFID_ACCOUNTS: RfidAccount[] = [
  { id: "rfid-1", ownerName: "Akshay Sharma", tagNumber: "FTAG-IND-9921", licensePlate: "MH-12-RS-1234", balance: 1450.50, status: "active" },
  { id: "rfid-2", ownerName: "Siddharth Verma", tagNumber: "FTAG-IND-2029", licensePlate: "DL-3C-AL-5678", balance: 85.20, status: "low-balance" },
  { id: "rfid-3", ownerName: "Priya Nair", tagNumber: "FTAG-IND-0007", licensePlate: "KA-03-MK-9911", balance: 8500.00, status: "active" },
  { id: "rfid-4", ownerName: "Amit Goel", tagNumber: "FTAG-IND-5081", licensePlate: "HR-26-BP-7000", balance: 350.00, status: "active" },
  { id: "rfid-5", ownerName: "Suresh Kumar", tagNumber: "FTAG-IND-0010", licensePlate: "UP-16-TR-4567", balance: 0.00, status: "suspended" },
  { id: "rfid-6", ownerName: "Vikram Seth", tagNumber: "FTAG-IND-4241", licensePlate: "TN-01-XX-9876", balance: 2180.40, status: "active" },
  { id: "rfid-7", ownerName: "Ananya Patel", tagNumber: "FTAG-IND-8832", licensePlate: "KA-51-AA-4321", balance: 45.00, status: "low-balance" }
];

let TRANSACTIONS: Transaction[] = [];
let isSimulationRunning = true;
let simulationFrequency = 5000; // time in ms between simulation events (default 5 seconds)

const PLATES = ["MH-12-RS-1234", "DL-3C-AL-5678", "KA-03-MK-9911", "HR-26-BP-7000", "UP-16-TR-4567", "TN-01-XX-9876", "KA-51-AA-4321", "MH-02-BY-8832", "DL-1A-ZZ-0007"];
const VEHICLE_OWNERS: Record<string, string> = {
  "MH-12-RS-1234": "Akshay Sharma",
  "DL-3C-AL-5678": "Siddharth Verma",
  "KA-03-MK-9911": "Priya Nair",
  "HR-26-BP-7000": "Amit Goel",
  "UP-16-TR-4567": "Suresh Kumar",
  "TN-01-XX-9876": "Vikram Seth",
  "KA-51-AA-4321": "Ananya Patel",
  "MH-02-BY-8832": "Deepak Mehta",
  "DL-1A-ZZ-0007": "Rajesh Khanna"
};

// Generate historical transactions spanning the last 12 hours
const generateMockHistory = () => {
  const now = new Date();
  const list: Transaction[] = [];
  const vehicleTypes: VehicleType[] = ["car", "truck", "bus", "motorcycle"];
  const paymentMethods: Array<'rfid' | 'cash' | 'unpaid'> = ["rfid", "cash", "rfid", "rfid", "cash", "unpaid"];

  for (let i = 80; i > 0; i--) {
    const timeOffset = i * 9 * 60 * 1000; // spacing back ~12 hours
    const eventTime = new Date(now.getTime() - timeOffset);
    
    const booth = BOOTHS[Math.floor(Math.random() * BOOTHS.length)];
    const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    const baseRate = booth.baseRate[vehicleType];
    const amount = Number((baseRate * booth.rateMultiplier).toFixed(2));
    
    const isExpress = booth.id.includes("express") || booth.name.includes("Express");
    const paymentMethod = isExpress 
      ? "rfid" 
      : paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    const licensePlate = PLATES[Math.floor(Math.random() * PLATES.length)];
    const owner = VEHICLE_OWNERS[licensePlate] || "Anonymous Driver";

    const rfidAcc = RFID_ACCOUNTS.find(a => a.licensePlate === licensePlate);
    
    let status: 'success' | 'flagged' | 'violation' = 'success';
    let violationDetails = "";

    if (paymentMethod === "unpaid") {
      status = "violation";
      violationDetails = "Plate Scanner Audited: Vehicle bypassed without manual or RFID pay.";
    } else if (paymentMethod === "rfid") {
      if (rfidAcc) {
        if (rfidAcc.status === "suspended") {
          status = "violation";
          violationDetails = `FASTag Suspended (Tag: ${rfidAcc.tagNumber}). Owner: ${rfidAcc.ownerName}`;
        } else if (rfidAcc.balance < amount) {
          status = "flagged";
          violationDetails = `FASTag Balance Deficit (Plate: ${licensePlate}, Bal: ₹${rfidAcc.balance.toFixed(2)}).`;
        }
      } else {
        // Tag mismatch/unregistered transponder
        status = "flagged";
        violationDetails = "Unregistered FASTag Transponder detected. Plate flagged for verification.";
      }
    }

    list.push({
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: eventTime.toISOString(),
      licensePlate,
      vehicleType,
      boothId: booth.id,
      boothName: booth.name,
      amount,
      paymentMethod,
      status,
      ownerName: owner,
      violationDetails: violationDetails || undefined
    });

    // Accumulate total metrics
    booth.totalRevenue += amount;
    booth.totalVehicles += 1;
  }
  TRANSACTIONS = list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

generateMockHistory();

// ----------------------------------------------------
// SIMULATION ENGINE INTERACTION (Live updates)
// ----------------------------------------------------
const runSimulationStep = () => {
  if (!isSimulationRunning) return;

  // Select random active toll booth
  const activeBooths = BOOTHS.filter(b => b.status === "active");
  if (activeBooths.length === 0) return;
  const booth = activeBooths[Math.floor(Math.random() * activeBooths.length)];

  const vehicleTypes: VehicleType[] = ["car", "car", "car", "truck", "bus", "motorcycle"];
  const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
  const baseRate = booth.baseRate[vehicleType];
  const amount = Number((baseRate * booth.rateMultiplier).toFixed(2));

  // Payment probability
  const randNum = Math.random();
  let paymentMethod: 'rfid' | 'cash' | 'unpaid' = 'rfid';
  if (booth.name.includes("RFID")) {
    paymentMethod = 'rfid';
  } else {
    paymentMethod = randNum > 0.85 ? 'unpaid' : (randNum > 0.45 ? 'cash' : 'rfid');
  }

  const licensePlate = PLATES[Math.floor(Math.random() * PLATES.length)];
  const owner = VEHICLE_OWNERS[licensePlate] || "Anonymous Driver";
  const rfidAcc = RFID_ACCOUNTS.find(a => a.licensePlate === licensePlate);

  let status: 'success' | 'flagged' | 'violation' = 'success';
  let violationDetails = "";

  if (paymentMethod === "unpaid") {
    status = "violation";
    violationDetails = "Unpaid passage event. Smart automatic license plate OCR flagged.";
  } else if (paymentMethod === "rfid") {
    if (rfidAcc) {
      if (rfidAcc.status === "suspended") {
        status = "violation";
        violationDetails = `FASTag Suspended (Tag: ${rfidAcc.tagNumber}). Owner: ${rfidAcc.ownerName}`;
      } else if (rfidAcc.balance < amount) {
        status = "flagged";
        violationDetails = `FASTag Low Balance. Tag balance ₹${rfidAcc.balance.toFixed(2)} is insufficient for ₹${amount.toFixed(2)} fare.`;
        // Deduct anyway for simulation, leaving a deficit
        rfidAcc.balance -= amount;
        rfidAcc.status = "low-balance";
      } else {
        // Deduct clean
        rfidAcc.balance = Number((rfidAcc.balance - amount).toFixed(2));
        if (rfidAcc.balance < 100) { // FASTag low balance alert if under ₹100 instead of ₹10
          rfidAcc.status = "low-balance";
        }
      }
    } else {
      status = "flagged";
      violationDetails = "Unregistered FASTag Tag detected. Manual auditing required.";
    }
  }

  const newTx: Transaction = {
    id: `tx-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    licensePlate,
    vehicleType,
    boothId: booth.id,
    boothName: booth.name,
    amount,
    paymentMethod,
    status,
    ownerName: owner,
    violationDetails: violationDetails || undefined
  };

  TRANSACTIONS.push(newTx);
  booth.totalRevenue += amount;
  booth.totalVehicles += 1;

  // Cap transaction logs to last 300 to keep memories clean
  if (TRANSACTIONS.length > 300) {
    TRANSACTIONS.shift();
  }
};

let simInterval = setInterval(runSimulationStep, simulationFrequency);

// Helper to calculate statistics
const getStats = (): DashboardStats => {
  let totalRevenue = 0;
  let totalVehicles = TRANSACTIONS.length;
  let violationsCount = 0;
  let rfidCount = 0;

  const revenueByVehicleType = { car: 0, truck: 0, bus: 0, motorcycle: 0 };
  const hourlyMap: Record<number, { revenue: number; volume: number }> = {};

  // Seed hours for complete chart line structure
  const currentHour = new Date().getHours();
  for (let i = 7; i >= 0; i--) {
    const h = (currentHour - i + 24) % 24;
    hourlyMap[h] = { revenue: 0, volume: 0 };
  }

  TRANSACTIONS.forEach(tx => {
    totalRevenue += tx.amount;
    revenueByVehicleType[tx.vehicleType] += tx.amount;

    if (tx.status === "violation") {
      violationsCount++;
    }
    if (tx.paymentMethod === "rfid") {
      rfidCount++;
    }

    // Capture hour breakdown
    const hr = new Date(tx.timestamp).getHours();
    if (hourlyMap[hr] !== undefined) {
      hourlyMap[hr].revenue += tx.amount;
      hourlyMap[hr].volume += 1;
    }
  });

  const hourlyDistribution = Object.keys(hourlyMap).map(hStr => {
    const h = Number(hStr);
    const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
    return {
      hour: label,
      revenue: Number(hourlyMap[h].revenue.toFixed(2)),
      volume: hourlyMap[h].volume
    };
  });

  // Calculate dynamic average
  const rfidPassAdoption = totalVehicles > 0 ? Math.round((rfidCount / totalVehicles) * 100) : 0;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalVehicles,
    violationsCount,
    rfidPassAdoption,
    revenueByVehicleType: {
      car: Number(revenueByVehicleType.car.toFixed(2)),
      truck: Number(revenueByVehicleType.truck.toFixed(2)),
      bus: Number(revenueByVehicleType.bus.toFixed(2)),
      motorcycle: Number(revenueByVehicleType.motorcycle.toFixed(2)),
    },
    hourlyDistribution
  };
};

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Toll Booth Operations
app.get("/api/booths", (req, res) => {
  res.json(BOOTHS);
});

app.post("/api/booths/:id/toggle", (req, res) => {
  const id = req.params.id;
  const booth = BOOTHS.find(b => b.id === id);
  if (!booth) {
    return res.status(404).json({ error: "Toll booth not found" });
  }

  const { status } = req.body;
  if (status && ["active", "maintenance", "closed"].includes(status)) {
    booth.status = status;
    return res.json({ success: true, booth });
  }
  res.status(400).json({ error: "Invalid status state" });
});

app.post("/api/booths/:id/price", (req, res) => {
  const id = req.params.id;
  const booth = BOOTHS.find(b => b.id === id);
  if (!booth) {
    return res.status(404).json({ error: "Toll booth not found" });
  }

  const { rateMultiplier } = req.body;
  if (typeof rateMultiplier === "number" && rateMultiplier >= 0.5 && rateMultiplier <= 3.0) {
    booth.rateMultiplier = Number(rateMultiplier.toFixed(2));
    return res.json({ success: true, booth });
  }
  res.status(400).json({ error: "Invalid dynamic multiplier. Range must be 0.5x to 3.0x." });
});

// Transactions list & Realtime
app.get("/api/transactions", (req, res) => {
  // Return transactions sorted newest first for live table views
  const list = [...TRANSACTIONS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(list);
});

app.post("/api/transactions/simulate", (req, res) => {
  runSimulationStep();
  res.json({ success: true, message: "Manual passage event simulated successfully.", transactionsCount: TRANSACTIONS.length });
});

// Statistics
app.get("/api/stats", (req, res) => {
  res.json(getStats());
});

// RFID Accounts Setup/Top-Ups
app.get("/api/rfid", (req, res) => {
  res.json(RFID_ACCOUNTS);
});

app.post("/api/rfid/topup", (req, res) => {
  const { id, amount } = req.body;
  const account = RFID_ACCOUNTS.find(a => a.id === id);
  if (!account) {
    return res.status(404).json({ error: "RFID Account registration not found" });
  }

  if (typeof amount === "number" && amount > 0) {
    account.balance = Number((account.balance + amount).toFixed(2));
    if (account.balance >= 100.0) {
      account.status = "active";
    }
    return res.json({ success: true, account });
  }
  res.status(400).json({ error: "Invalid deposit amount" });
});

// Adjust simulation rates
app.get("/api/simulation/config", (req, res) => {
  res.json({ isSimulationRunning, simulationFrequency });
});

app.post("/api/simulation/config", (req, res) => {
  const { running, frequency } = req.body;
  if (running !== undefined) {
    isSimulationRunning = running;
  }
  if (typeof frequency === "number" && frequency >= 1000 && frequency <= 30000) {
    simulationFrequency = frequency;
    clearInterval(simInterval);
    simInterval = setInterval(runSimulationStep, simulationFrequency);
  }
  res.json({ isSimulationRunning, simulationFrequency });
});

// ----------------------------------------------------
// AI GEMINI ANALYTICS DISPATCHER
// ----------------------------------------------------
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.json({ 
        text: "**Akshay's Gemini AI Dispatcher Demo Mode**\n\nPlease configure your `GEMINI_API_KEY` under the settings menu to enable live Gemini intelligent forecasts!\n\n*Simulated Traffic Analysis Suggestion:* We noticed heavy traffic on the NH-44 Express lane. We suggest adjusting the FASTag surge multiplier to 1.50x during peak congestion hours to regulate density and maximize public transit lane usage." 
      });
    }

    const { prompt } = req.body;
    
    // Prepare transaction audit summary context for the AI
    const liveStats = getStats();
    const activeBoothsStr = BOOTHS.map(b => `${b.name} Status: (${b.status}), Multiplier: ${b.rateMultiplier}x`).join('\n');
    const recentTxSummary = TRANSACTIONS.slice(-10).map(t => `- ${new Date(t.timestamp).toLocaleTimeString()}: ${t.vehicleType.toUpperCase()} on ${t.boothName} (₹${t.amount}) via ${t.paymentMethod.toUpperCase()} -> Status: ${t.status}`).join('\n');

    const systemContext = `
You are the AI Toll Traffic Commander for Akshay's Toll Gate System on NH-44 and Mumbai-Pune Expressway, India. 
You are speaking to toll plaza command personnel.

Here is the current network telemetry data state:
- Total Lane Volume (Session): ${liveStats.totalVehicles} transits
- Total Revenue Generated: ₹${liveStats.totalRevenue.toFixed(2)}
- Unpaid/Violation Transits: ${liveStats.violationsCount}
- FASTag Lane Adoption: ${liveStats.rfidPassAdoption}%
- Vehicle Revenue Contribution (INR): Car (₹${liveStats.revenueByVehicleType.car}), Truck (₹${liveStats.revenueByVehicleType.truck}), Bus (₹${liveStats.revenueByVehicleType.bus}), Motorcycle (₹${liveStats.revenueByVehicleType.motorcycle})

Active Booths Configurations:
${activeBoothsStr}

Latest 10 passage audit logs:
${recentTxSummary}

User is asking: "${prompt || 'Provide a routine check audit and highlight any revenue leakage or optimization points.'}"

Keep your response highly executive, actionable, crisp, and beautifully formatted in markdown. Include currency in Indian Rupees (₹ / INR).
Focus on identifying congestion, revenue leakage points (violations or low balances), dynamic surge pricing recommendations, and vehicle class distributions. Avoid conversational boilerplate. Write in a confident, authoritative operations commander tone.
`;

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemContext,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini AI API Error details:", error);
    res.status(500).json({ error: "Gemini AI dispatch could not complete.", details: error?.message || error });
  }
});

// ----------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Toll Management Server listening at http://localhost:${PORT}`);
  });
}

startServer();

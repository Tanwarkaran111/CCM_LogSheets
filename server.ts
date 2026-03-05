import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import os from "os";

const DATA_FILE = path.join(process.cwd(), "history.json");

// Get OneDrive path
const getOneDrivePath = (): string | null => {
  const homeDir = os.homedir();
  const oneDrivePath = path.join(homeDir, "OneDrive");
  
  if (fs.existsSync(oneDrivePath)) {
    return oneDrivePath;
  }
  
  // Try alternative OneDrive path (Business accounts)
  const oneDriveBusinessPath = path.join(homeDir, "OneDrive - Business");
  if (fs.existsSync(oneDriveBusinessPath)) {
    return oneDriveBusinessPath;
  }
  
  return null;
};

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // API Routes
  app.get("/api/history", (req, res) => {
    try {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read history" });
    }
  });

  app.post("/api/history", (req, res) => {
    try {
      const newEntry = req.body;
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const history = JSON.parse(data);
      history.push(newEntry);
      fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
      res.json({ success: true, count: history.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to save entry" });
    }
  });

  // Clear history (optional helper)
  app.delete("/api/history", (req, res) => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear history" });
    }
  });

  // Save Excel file to OneDrive
  app.post("/api/save-to-onedrive", (req, res) => {
    try {
      const { fileName, fileData } = req.body;
      const oneDrivePath = getOneDrivePath();

      if (!oneDrivePath) {
        return res.status(400).json({
          error: "OneDrive not available in this environment. Files are only saved locally when running the app.",
          success: false
        });
      }

      // Create app folder in OneDrive if it doesn't exist
      const appFolderPath = path.join(oneDrivePath, "CCM-LogSheet");
      if (!fs.existsSync(appFolderPath)) {
        fs.mkdirSync(appFolderPath, { recursive: true });
      }

      // Write file
      const filePath = path.join(appFolderPath, fileName);
      const buffer = Buffer.from(fileData, 'base64');
      fs.writeFileSync(filePath, buffer);

      res.json({
        success: true,
        path: filePath,
        message: `File saved to OneDrive: ${appFolderPath}`
      });
    } catch (error) {
      console.error("Error saving to OneDrive:", error);
      res.status(500).json({
        error: "Failed to save to OneDrive",
        details: (error as Error).message,
        success: false
      });
    }
  });

  // Check OneDrive availability
  app.get("/api/check-onedrive", (req, res) => {
    try {
      const oneDrivePath = getOneDrivePath();
      if (oneDrivePath) {
        res.json({ 
          available: true, 
          path: oneDrivePath 
        });
      } else {
        res.json({ 
          available: false, 
          message: "OneDrive folder not found" 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to check OneDrive",
        available: false 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

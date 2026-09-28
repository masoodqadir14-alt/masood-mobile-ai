import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const dataDir = path.join(__dirname, "data");

function readText(name) {
    try {
        return fs.readFileSync(
            path.join(dataDir, name),
            "utf8"
        );
    } catch {
        return "";
    }
}

function readMemory() {
    try {
        return JSON.parse(
            fs.readFileSync(
                path.join(dataDir, "memory.json"),
                "utf8"
            )
        );
    } catch {
        return {
            permanent: [],
            daily: []
        };
    }
}

function saveMemory(memory) {
    fs.writeFileSync(
        path.join(dataDir, "memory.json"),
        JSON.stringify(memory, null, 2)
    );
}

function buildInstructions() {
    return (
        "You are Dr. Masood Qadir's personal AI assistant.\n\n" +

        "PERSONAL INFORMATION:\n" +
        readText("personal_info.txt") +
        "\n\n" +

        "ACADEMIC INFORMATION:\n" +
        readText("academic_info.txt") +
        "\n\n" +

        "SAVED MEMORY:\n" +
        JSON.stringify(readMemory(), null, 2) +
        "\n\n" +

        "RULES:\n" +
        "1. Understand the user's intent before answering.\n" +
        "2. Use stored information when relevant.\n" +
        "3. Use the latest saved memory when information conflicts.\n" +
        "4. Never invent facts.\n" +
        "5. Be natural, friendly and concise.\n" +
        "6. Do not claim to be Dr. Masood.\n" +
        "7. If asked who you are, say you are Dr. Masood's AI assistant.\n" +
        "8. Reply in English when the user writes in English.\n" +
        "9. Use Urdu or Roman Urdu when appropriate.\n" +
        "10. Use academic information for courses and academic questions.\n" +
        "11. For course-code questions, give the exact stored code.\n" +
        "12. Do not invent or change course codes.\n" +
        "13. Do not unnecessarily mention Dr. Masood in routine academic answers.\n" +
        "14. If information is unavailable, clearly say so.\n" +
        "15. Do not make official or important decisions on Dr. Masood's behalf."
    );
}

app.use(express.json({ limit: "1mb" }));

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.get("/api/status", function(req, res) {
    res.json({
        online: true,
        model: MODEL
    });
});

app.get("/api/memory", function(req, res) {
    res.json(readMemory());
});

app.post("/api/memory", function(req, res) {

    const type = req.body?.type;
    const information = req.body?.information;

    if (
        !["permanent", "daily"].includes(type) ||
        !information ||
        !information.trim()
    ) {
        return res.status(400).json({
            error: "type and information are required"
        });
    }

    const memory = readMemory();

    memory[type].push({
        date: new Date().toISOString(),
        information: information.trim()
    });

    saveMemory(memory);

    res.json({
        ok: true,
        memory: memory
    });
});

app.delete("/api/memory", function(req, res) {

    const q = String(
        req.body?.information || ""
    ).trim().toLowerCase();

    if (!q) {
        return res.status(400).json({
            error: "information is required"
        });
    }

    const memory = readMemory();

    const before =
        memory.permanent.length +
        memory.daily.length;

    memory.permanent =
        memory.permanent.filter(function(item) {
            return !item.information
                .toLowerCase()
                .includes(q);
        });

    memory.daily =
        memory.daily.filter(function(item) {
            return !item.information
                .toLowerCase()
                .includes(q);
        });

    saveMemory(memory);

    const after =
        memory.permanent.length +
        memory.daily.length;

    res.json({
        ok: true,
        removed: before - after,
        memory: memory
    });
});

app.post("/api/chat", async function(req, res) {

    try {

        const message =
            String(
                req.body?.message || ""
            ).trim();

        const history =
            Array.isArray(req.body?.history)
                ? req.body.history.slice(-12)
                : [];

        if (!message) {
            return res.status(400).json({
                error: "Message is required."
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error:
                    "Gemini API key is not configured."
            });
        }

        const model =
            genAI.getGenerativeModel({
                model: MODEL,
                systemInstruction:
                    buildInstructions()
            });

        const chatHistory = history
            .map(function(item) {

                return {
                    role:
                        item.role === "assistant"
                            ? "model"
                            : "user",

                    parts: [
                        {
                            text:
                                String(
                                    item.content || ""
                                )
                        }
                    ]
                };
            });

        const chat =
            model.startChat({
                history: chatHistory
            });

        const result =
            await chat.sendMessage(message);

        const reply =
            result.response.text();

        res.json({
            reply: reply
        });

    } catch (error) {

        console.error("Gemini error:");
        console.error(error);

        res.status(500).json({
            error:
                "The AI service could not answer right now."
        });
    }
});

app.listen(
    PORT,
    function() {
        console.log(
            "Masood Mobile AI running on port " +
            PORT
        );
    }
);
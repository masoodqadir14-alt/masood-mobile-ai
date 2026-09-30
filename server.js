import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function readMemory() {
    const { data, error } = await supabase
        .from("memories")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    return {
        permanent: data
            .filter(item => item.type === "permanent")
            .map(item => ({
                text: item.content,
                savedAt: item.created_at
            })),

        daily: data
            .filter(item => item.type === "daily")
            .map(item => ({
                text: item.content,
                savedAt: item.created_at
            }))
    };
}

async function saveMemoryItem(type, text) {
    const { error } = await supabase
        .from("memories")
        .insert({
            type: type,
            content: text
        });

    if (error) {
        throw error;
    }
}

async function deleteMemoryItem(searchText) {
    const { data, error } = await supabase
        .from("memories")
        .select("*");

    if (error) {
        throw error;
    }

    const search = searchText.toLowerCase().trim();

    const matches = data.filter(function(item) {
        return item.content.toLowerCase().includes(search);
    });

    for (const item of matches) {
        const { error: deleteError } = await supabase
            .from("memories")
            .delete()
            .eq("id", item.id);

        if (deleteError) {
            throw deleteError;
        }
    }

    return matches.length;
}

async function buildInstructions() {
    const memory = await readMemory();

    return (
        "You are Dr. Masood Qadir's personal AI assistant.\n\n" +

        "PERSONAL INFORMATION:\n" +
        readText("personal_info.txt") +
        "\n\n" +

        "ACADEMIC INFORMATION:\n" +
        readText("academic_info.txt") +
        "\n\n" +

        "SAVED MEMORY:\n" +
        JSON.stringify(memory, null, 2) +
        "\n\n" +
"RULES:\n" +
"1. Understand the user's intent before answering.\n" +
"2. Use stored personal, academic and saved-memory information when relevant.\n" +
"3. Always prefer the latest saved memory when information conflicts.\n" +
"4. Never invent personal, academic or administrative facts.\n" +
"5. Be natural, friendly, accurate and concise.\n" +
"6. Do not claim to be Dr. Masood.\n" +
"7. If asked who you are, say you are Dr. Masood's AI assistant.\n" +
"8. Reply in English when the user writes in English.\n" +
"9. Use Urdu or Roman Urdu when appropriate.\n" +
"10. Use academic information for courses, curriculum and academic questions.\n" +
"11. For course-code questions, give the exact stored course code.\n" +
"12. Do not invent, modify or guess course codes.\n" +
"13. Do not unnecessarily mention Dr. Masood in routine academic answers.\n" +
"14. If information is unavailable, clearly say so.\n" +
"15. Do not make official or important decisions on Dr. Masood's behalf.\n" +
"16. When the user says remember, save this, store this, note this, or similar wording, treat the message as a request to save the relevant information in memory.\n" +
"17. When the user asks to forget or remove a saved memory, do not save it; explain that the relevant saved memory needs to be removed.\n" +
"18. When asked what you remember, use the saved memory data provided to you and summarize it clearly.\n" +
"19. Do not confuse temporary conversation history with permanent saved memory.\n" +
"20. For important personal or academic information, rely on stored information rather than guessing."
    );
}
app.use(express.json({ limit: "1mb" }));
app.use(cors());

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

app.get("/api/memory", async function(req, res) {
    try {
        const memory = await readMemory();

        res.json(memory);
    } catch (error) {
        console.error("Memory error:");
        console.error(error);

        res.status(500).json({
            error: "Could not read memory."
        });
    }
});

app.delete("/api/memory", async function(req, res) {

    try {

        const q = String(
            req.body?.information || ""
        ).trim().toLowerCase();

        if (!q) {
            return res.status(400).json({
                error: "information is required"
            });
        }

        const { data, error } = await supabase
            .from("memories")
            .select("*");

        if (error) {
            throw error;
        }

        const matches = data.filter(function(item) {
            return item.content
                .toLowerCase()
                .includes(q);
        });

        for (const item of matches) {
            const { error: deleteError } = await supabase
                .from("memories")
                .delete()
                .eq("id", item.id);

            if (deleteError) {
                throw deleteError;
            }
        }

        const memory = await readMemory();

        res.json({
            ok: true,
            removed: matches.length,
            memory: memory
        });

    } catch (error) {

        console.error("Memory delete error:");
        console.error(error);

        res.status(500).json({
            error: "Could not delete memory."
        });
    }
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
const lowerMessage = message.toLowerCase();

const isForgetRequest =
    lowerMessage.startsWith("forget ") ||
    lowerMessage.startsWith("remove ") ||
    lowerMessage.startsWith("delete ");

if (isForgetRequest) {
    const searchText = message
        .replace(/^(forget|remove|delete)\s+/i, "")
        .replace(/^that\s+/i, "")
        .trim();

    if (searchText) {
        const removed = await deleteMemoryItem(searchText);

        return res.json({
            reply:
                removed > 0
                    ? "Done. I have removed that information from my saved memory."
                    : "I could not find that information in my saved memory."
        });
    }
}
        const model =
            genAI.getGenerativeModel({
                model: MODEL,
                systemInstruction:
                    await buildInstructions()
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

while (
    chatHistory.length > 0 &&
    chatHistory[0].role !== "user"
) {
    chatHistory.shift();
}

        const chat =
            model.startChat({
                history: chatHistory
            });

        let result;

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        result = await chat.sendMessage(message);
        break;
    } catch (error) {
        console.error(`Gemini attempt ${attempt} failed:`, error);

        if (attempt === 3) {
            throw error;
        }

        await new Promise(resolve =>
            setTimeout(resolve, 1500)
        );
    }
}

const reply =
    result.response.text();


const isSaveRequest =
    lowerMessage.startsWith("remember that ") ||
    lowerMessage.startsWith("remember ") ||
    lowerMessage.startsWith("save this") ||
    lowerMessage.startsWith("store this") ||
    lowerMessage.startsWith("note that ") ||
    lowerMessage.startsWith("note ");

if (isSaveRequest) {
    await saveMemoryItem(
        "permanent",
        message
    );
}


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